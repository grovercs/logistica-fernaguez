BEGIN;

CREATE OR REPLACE FUNCTION public.admin_test_user_owns_storage_objects(
  p_actor_user_id uuid,
  p_target_user_id uuid
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_actor_user_id IS NULL OR p_target_user_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_ARGUMENT';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.perfiles AS p
    INNER JOIN public.roles AS r ON r.id = p.rol_id
    WHERE p.id = p_actor_user_id
      AND p.activo IS TRUE
      AND r.nombre = 'Administrador'
  ) THEN
    RAISE EXCEPTION 'ADMIN_FORBIDDEN';
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM storage.objects AS o
    WHERE o.owner = p_target_user_id
       OR o.owner_id = p_target_user_id::text
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_test_user_owns_storage_objects(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_test_user_owns_storage_objects(uuid, uuid)
  TO service_role;

COMMENT ON FUNCTION public.admin_test_user_owns_storage_objects(uuid, uuid)
  IS 'Comprobacion administrativa de solo lectura para impedir eliminar cuentas Auth de prueba propietarias de objetos Storage.';

COMMIT;
