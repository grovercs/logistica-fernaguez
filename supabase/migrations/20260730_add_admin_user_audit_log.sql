BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_user_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  success boolean NOT NULL,
  error_message text CHECK (error_message IS NULL OR char_length(error_message) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_user_audit_log_created_at_idx ON public.admin_user_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_user_audit_log_target_user_id_idx ON public.admin_user_audit_log (target_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS trabajadores_auth_user_id_unique_idx
  ON public.trabajadores (auth_user_id) WHERE auth_user_id IS NOT NULL;

ALTER TABLE public.admin_user_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Administradores leen auditoria de usuarios" ON public.admin_user_audit_log;
CREATE POLICY "Administradores leen auditoria de usuarios"
  ON public.admin_user_audit_log FOR SELECT TO authenticated
  USING (private.current_user_has_role(ARRAY['Administrador']::text[]));
REVOKE ALL PRIVILEGES ON TABLE public.admin_user_audit_log FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.admin_user_audit_log FROM authenticated;
GRANT SELECT ON TABLE public.admin_user_audit_log TO authenticated;

-- Las mutaciones y su auditoria forman una sola transaccion: sin auditoria,
-- la operacion se revierte deliberadamente.
CREATE OR REPLACE FUNCTION public.admin_update_user_access(
  p_actor_user_id uuid, p_target_user_id uuid, p_rol_id uuid DEFAULT NULL, p_activo boolean DEFAULT NULL
) RETURNS TABLE (rol_id uuid, activo boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_old_rol_id uuid; v_old_activo boolean; v_old_role_name text;
  v_new_role_name text; v_new_rol_id uuid; v_new_activo boolean; v_active_administrators integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.perfiles AS p JOIN public.roles AS r ON r.id = p.rol_id
    WHERE p.id = p_actor_user_id AND p.activo IS TRUE AND r.nombre = 'Administrador'
  ) THEN RAISE EXCEPTION 'ADMIN_FORBIDDEN'; END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_target_user_id) THEN RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('admin_user_access', 0));
  SELECT p.rol_id, p.activo, r.nombre INTO v_old_rol_id, v_old_activo, v_old_role_name
    FROM public.perfiles AS p LEFT JOIN public.roles AS r ON r.id = p.rol_id
    WHERE p.id = p_target_user_id FOR UPDATE OF p;
  IF NOT FOUND THEN RAISE EXCEPTION 'USER_PROFILE_NOT_FOUND'; END IF;
  v_new_rol_id := COALESCE(p_rol_id, v_old_rol_id);
  v_new_activo := COALESCE(p_activo, v_old_activo);
  SELECT nombre INTO v_new_role_name FROM public.roles WHERE id = v_new_rol_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'ROLE_NOT_FOUND'; END IF;
  IF v_old_role_name = 'Administrador' AND v_old_activo IS TRUE
     AND (v_new_role_name <> 'Administrador' OR v_new_activo IS FALSE) THEN
    SELECT count(*) INTO v_active_administrators FROM public.perfiles AS p
      JOIN public.roles AS r ON r.id = p.rol_id WHERE p.activo IS TRUE AND r.nombre = 'Administrador';
    IF v_active_administrators <= 1 THEN RAISE EXCEPTION 'LAST_ACTIVE_ADMINISTRATOR'; END IF;
  END IF;
  UPDATE public.perfiles SET rol_id = v_new_rol_id, activo = v_new_activo WHERE id = p_target_user_id;
  INSERT INTO public.admin_user_audit_log (actor_user_id, target_user_id, action, old_values, new_values, success)
  VALUES (p_actor_user_id, p_target_user_id, 'update_user_access',
    jsonb_build_object('rol_id', v_old_rol_id, 'activo', v_old_activo),
    jsonb_build_object('rol_id', v_new_rol_id, 'activo', v_new_activo), true);
  RETURN QUERY SELECT v_new_rol_id, v_new_activo;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_link_user_worker(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_trabajador_id uuid,
  p_confirm_active_assignments boolean DEFAULT false
) RETURNS TABLE (trabajador_id uuid, action text, active_assignments integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_old_trabajador_id uuid; v_requested_worker_auth uuid; v_existing_link_count integer;
  v_active_assignments integer := 0; v_action text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.perfiles AS p JOIN public.roles AS r ON r.id = p.rol_id
    WHERE p.id = p_actor_user_id AND p.activo IS TRUE AND r.nombre = 'Administrador'
  ) THEN RAISE EXCEPTION 'ADMIN_FORBIDDEN'; END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_target_user_id) THEN RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.perfiles WHERE id = p_target_user_id) THEN RAISE EXCEPTION 'USER_PROFILE_NOT_FOUND'; END IF;

  -- Serializa enlaces para impedir carreras entre dos cuentas y una misma ficha.
  PERFORM pg_advisory_xact_lock(hashtextextended('admin_link_user_worker', 0));
  PERFORM 1 FROM public.trabajadores WHERE auth_user_id = p_target_user_id FOR UPDATE;
  SELECT count(*) INTO v_existing_link_count FROM public.trabajadores WHERE auth_user_id = p_target_user_id;
  IF v_existing_link_count > 1 THEN RAISE EXCEPTION 'ACCOUNT_LINK_CONFLICT'; END IF;
  SELECT id INTO v_old_trabajador_id FROM public.trabajadores WHERE auth_user_id = p_target_user_id;

  IF p_trabajador_id IS NULL THEN
    IF v_old_trabajador_id IS NOT NULL THEN
      SELECT count(*) INTO v_active_assignments FROM public.orden_asignaciones
       WHERE trabajador_id = v_old_trabajador_id AND estado IN ('pendiente', 'en_progreso');
      IF v_active_assignments > 0 AND NOT p_confirm_active_assignments THEN
        RAISE EXCEPTION 'ADMIN_LINK_CONFIRMATION_REQUIRED:%', v_active_assignments;
      END IF;
      UPDATE public.trabajadores SET auth_user_id = NULL WHERE id = v_old_trabajador_id;
    END IF;
    v_action := 'unlink_user_worker';
    INSERT INTO public.admin_user_audit_log (actor_user_id, target_user_id, action, old_values, new_values, success)
    VALUES (p_actor_user_id, p_target_user_id, v_action,
      jsonb_build_object('trabajador_id', v_old_trabajador_id, 'active_assignments', v_active_assignments),
      jsonb_build_object('trabajador_id', NULL, 'active_assignments_confirmed', p_confirm_active_assignments), true);
    RETURN QUERY SELECT NULL::uuid, v_action, v_active_assignments;
    RETURN;
  END IF;

  SELECT auth_user_id INTO v_requested_worker_auth FROM public.trabajadores
   WHERE id = p_trabajador_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'WORKER_NOT_FOUND'; END IF;
  IF v_requested_worker_auth IS NOT NULL AND v_requested_worker_auth <> p_target_user_id THEN RAISE EXCEPTION 'WORKER_LINK_CONFLICT'; END IF;
  IF v_old_trabajador_id IS NOT NULL AND v_old_trabajador_id <> p_trabajador_id THEN RAISE EXCEPTION 'ACCOUNT_LINK_CONFLICT'; END IF;

  SELECT count(*) INTO v_active_assignments FROM public.orden_asignaciones
   WHERE trabajador_id = p_trabajador_id AND estado IN ('pendiente', 'en_progreso');
  IF v_active_assignments > 0 AND NOT p_confirm_active_assignments THEN
    RAISE EXCEPTION 'ADMIN_LINK_CONFIRMATION_REQUIRED:%', v_active_assignments;
  END IF;
  UPDATE public.trabajadores SET auth_user_id = p_target_user_id WHERE id = p_trabajador_id;
  v_action := 'link_user_worker';
  INSERT INTO public.admin_user_audit_log (actor_user_id, target_user_id, action, old_values, new_values, success)
  VALUES (p_actor_user_id, p_target_user_id, v_action,
    jsonb_build_object('trabajador_id', v_old_trabajador_id, 'active_assignments', v_active_assignments),
    jsonb_build_object('trabajador_id', p_trabajador_id, 'active_assignments', v_active_assignments,
      'active_assignments_confirmed', p_confirm_active_assignments), true);
  RETURN QUERY SELECT p_trabajador_id, v_action, v_active_assignments;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_user_access(uuid, uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_link_user_worker(uuid, uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_user_access(uuid, uuid, uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_link_user_worker(uuid, uuid, uuid, boolean) TO service_role;

COMMENT ON TABLE public.admin_user_audit_log IS 'Auditoria inmutable de operaciones administrativas de usuarios; las mutaciones exitosas solo son validas si su auditoria se inserta en la misma transaccion.';
COMMENT ON FUNCTION public.admin_update_user_access(uuid, uuid, uuid, boolean) IS 'Mutacion atomica de rol y estado para funciones administrativas de servidor.';
COMMENT ON FUNCTION public.admin_link_user_worker(uuid, uuid, uuid, boolean) IS 'Vinculo atomico cuenta-trabajador para funciones administrativas de servidor.';

COMMIT;
