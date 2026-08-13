BEGIN;

-- Auth se crea desde una Netlify Function y no comparte transaccion con
-- Postgres. Esta RPC deja atomicos el perfil y el cierre de su auditoria.
CREATE OR REPLACE FUNCTION public.admin_create_managed_user(
  p_actor_user_id uuid,
  p_audit_id uuid,
  p_target_user_id uuid,
  p_nombre_completo text,
  p_rol_id uuid,
  p_activo boolean
) RETURNS TABLE (rol_id uuid, activo boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role_name text;
  v_audit_rows integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM auth.users AS u
    WHERE u.id = p_actor_user_id
  ) THEN
    RAISE EXCEPTION 'ACTOR_NOT_FOUND';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.perfiles AS p
    JOIN public.roles AS r ON r.id = p.rol_id
    WHERE p.id = p_actor_user_id
      AND p.activo IS TRUE
      AND r.nombre = 'Administrador'
  ) THEN
    RAISE EXCEPTION 'ADMIN_FORBIDDEN';
  END IF;

  IF p_activo IS NULL THEN
    RAISE EXCEPTION 'INVALID_ACTIVE_VALUE';
  END IF;

  p_nombre_completo := NULLIF(pg_catalog.btrim(p_nombre_completo), '');
  IF p_nombre_completo IS NOT NULL AND pg_catalog.char_length(p_nombre_completo) > 120 THEN
    RAISE EXCEPTION 'INVALID_NAME';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users AS u WHERE u.id = p_target_user_id) THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  SELECT r.nombre INTO v_role_name
  FROM public.roles AS r
  WHERE r.id = p_rol_id
  FOR KEY SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ROLE_NOT_FOUND';
  END IF;
  IF v_role_name = 'Administrador' THEN
    RAISE EXCEPTION 'ADMIN_ROLE_NOT_ALLOWED';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('admin_create_managed_user:' || p_target_user_id::text, 0));

  PERFORM 1
  FROM public.admin_user_audit_log AS a
  WHERE a.id = p_audit_id
    AND a.actor_user_id = p_actor_user_id
    AND a.action = 'admin_create_user'
    AND a.success IS FALSE
    AND a.error_message = 'AUTH_CREATED_PROFILE_PENDING'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'AUDIT_NOT_FOUND';
  END IF;

  IF EXISTS (SELECT 1 FROM public.perfiles AS p WHERE p.id = p_target_user_id) THEN
    RAISE EXCEPTION 'USER_PROFILE_ALREADY_EXISTS';
  END IF;

  INSERT INTO public.perfiles (id, nombre_completo, rol_id, activo)
  VALUES (p_target_user_id, p_nombre_completo, p_rol_id, p_activo);

  UPDATE public.admin_user_audit_log
  SET target_user_id = p_target_user_id,
      new_values = pg_catalog.jsonb_build_object(
        'target_user_id', p_target_user_id::text,
        'rol_id', p_rol_id,
        'rol_nombre', v_role_name,
        'activo', p_activo
      ),
      success = TRUE,
      error_message = NULL
  WHERE id = p_audit_id;

  GET DIAGNOSTICS v_audit_rows = ROW_COUNT;
  IF v_audit_rows <> 1 THEN
    RAISE EXCEPTION 'AUDIT_FINALIZATION_FAILED';
  END IF;

  RETURN QUERY SELECT p_rol_id, p_activo;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_create_managed_user(uuid, uuid, uuid, text, uuid, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_managed_user(uuid, uuid, uuid, text, uuid, boolean)
  TO service_role;

COMMENT ON FUNCTION public.admin_create_managed_user(uuid, uuid, uuid, text, uuid, boolean)
  IS 'Crea el perfil de una cuenta Auth nueva y finaliza su auditoria admin_create_user en una sola transaccion; no crea trabajadores ni modifica Auth metadata.';

COMMIT;
