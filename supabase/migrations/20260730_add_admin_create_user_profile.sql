BEGIN;

-- Crea un perfil operativo para una cuenta Auth ya existente. La operacion y
-- su auditoria son atomicas: si la auditoria falla, el perfil no se crea.
CREATE OR REPLACE FUNCTION public.admin_create_user_profile(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_rol_id uuid,
  p_activo boolean
) RETURNS TABLE (rol_id uuid, activo boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role_name text;
BEGIN
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

  IF NOT EXISTS (SELECT 1 FROM auth.users AS u WHERE u.id = p_target_user_id) THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  SELECT r.nombre INTO v_role_name
  FROM public.roles AS r
  WHERE r.id = p_rol_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ROLE_NOT_FOUND';
  END IF;

  -- Serializa dos solicitudes simultaneas para la misma cuenta Auth.
  PERFORM pg_advisory_xact_lock(hashtextextended('admin_create_user_profile:' || p_target_user_id::text, 0));

  IF EXISTS (SELECT 1 FROM public.perfiles AS p WHERE p.id = p_target_user_id) THEN
    RAISE EXCEPTION 'USER_PROFILE_ALREADY_EXISTS';
  END IF;

  BEGIN
    INSERT INTO public.perfiles (id, rol_id, activo)
    VALUES (p_target_user_id, p_rol_id, p_activo);
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'USER_PROFILE_ALREADY_EXISTS';
  END;

  INSERT INTO public.admin_user_audit_log (
    actor_user_id, target_user_id, action, old_values, new_values, success
  ) VALUES (
    p_actor_user_id,
    p_target_user_id,
    'create_user_profile',
    NULL,
    jsonb_build_object('rol_id', p_rol_id, 'rol_nombre', v_role_name, 'activo', p_activo),
    TRUE
  );

  RETURN QUERY SELECT p_rol_id, p_activo;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_create_user_profile(uuid, uuid, uuid, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_user_profile(uuid, uuid, uuid, boolean)
  TO service_role;

COMMENT ON FUNCTION public.admin_create_user_profile(uuid, uuid, uuid, boolean)
  IS 'Crea atomicamente el perfil de una cuenta Auth existente desde una Function administrativa de servidor; no modifica Auth metadata ni trabajadores.';

COMMIT;
