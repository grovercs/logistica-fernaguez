-- Archives a selected, fully finalized batch atomically. This migration does
-- not change any order until the RPC is invoked by an active Administrator.

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_archive_orders(p_order_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_requested_count integer;
  v_distinct_count integer;
  v_found_count integer;
  v_invalid_count integer;
  v_updated_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE = '28000';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.perfiles AS perfil
    INNER JOIN public.roles AS rol ON rol.id = perfil.rol_id
    WHERE perfil.id = auth.uid()
      AND perfil.activo = true
      AND rol.nombre = 'Administrador'
  ) THEN
    RAISE EXCEPTION 'ADMINISTRATOR_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF p_order_ids IS NULL
    OR pg_catalog.cardinality(p_order_ids) = 0
    OR pg_catalog.array_position(p_order_ids, NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'ORDER_IDS_REQUIRED' USING ERRCODE = '22023';
  END IF;

  SELECT pg_catalog.count(*), pg_catalog.count(DISTINCT selected_order_id)
  INTO v_requested_count, v_distinct_count
  FROM pg_catalog.unnest(p_order_ids) AS selected_order_id;

  IF v_requested_count <> v_distinct_count THEN
    RAISE EXCEPTION 'DUPLICATE_ORDER_IDS' USING ERRCODE = '22023';
  END IF;

  PERFORM 1
  FROM public.ordenes
  WHERE id = ANY(p_order_ids)
  ORDER BY id
  FOR UPDATE;

  SELECT pg_catalog.count(*)
  INTO v_found_count
  FROM public.ordenes
  WHERE id = ANY(p_order_ids);

  IF v_found_count <> v_requested_count THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  SELECT pg_catalog.count(*)
  INTO v_invalid_count
  FROM public.ordenes
  WHERE id = ANY(p_order_ids)
    AND estado NOT IN ('Finalizada', 'Finalizado');

  IF v_invalid_count <> 0 THEN
    RAISE EXCEPTION 'ORDERS_NOT_FINALIZED' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.ordenes
  SET estado_previo = estado,
      estado = 'Archivado'
  WHERE id = ANY(p_order_ids);

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count <> v_requested_count THEN
    RAISE EXCEPTION 'ARCHIVE_COUNT_MISMATCH' USING ERRCODE = 'P0001';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_archive_orders(uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_archive_orders(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_archive_orders(uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_restore_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_updated_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE = '28000';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.perfiles AS perfil
    INNER JOIN public.roles AS rol ON rol.id = perfil.rol_id
    WHERE perfil.id = auth.uid()
      AND perfil.activo = true
      AND rol.nombre = 'Administrador'
  ) THEN
    RAISE EXCEPTION 'ADMINISTRATOR_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'ORDER_ID_REQUIRED' USING ERRCODE = '22023';
  END IF;

  PERFORM 1
  FROM public.ordenes
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.ordenes
  SET estado = COALESCE(estado_previo, 'Finalizada'),
      estado_previo = NULL
  WHERE id = p_order_id
    AND estado = 'Archivado';

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count = 0 THEN
    RAISE EXCEPTION 'ORDER_NOT_ARCHIVED' USING ERRCODE = 'P0001';
  END IF;

  IF v_updated_count <> 1 THEN
    RAISE EXCEPTION 'RESTORE_COUNT_MISMATCH' USING ERRCODE = 'P0001';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_restore_order(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_restore_order(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_restore_order(uuid) TO authenticated;

COMMIT;
