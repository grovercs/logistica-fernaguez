BEGIN;

-- Phase 1: worker report RPC, compatible with the policies active before
-- the RLS hardening migration. Depends on private.current_user_has_role(text[]).

CREATE OR REPLACE FUNCTION private.current_user_is_worker(p_worker_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND private.current_user_has_role(ARRAY['Trabajador'])
    AND EXISTS (
      SELECT 1
      FROM public.perfiles AS p
      JOIN public.trabajadores AS t
        ON t.auth_user_id = p.id
      WHERE p.id = auth.uid()
        AND p.activo IS TRUE
        AND t.id = p_worker_id
        AND t.auth_user_id = auth.uid()
    );
$$;

REVOKE EXECUTE
  ON FUNCTION private.current_user_is_worker(uuid)
  FROM PUBLIC, anon;

GRANT EXECUTE
  ON FUNCTION private.current_user_is_worker(uuid)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.current_user_assigned_to_order(p_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND private.current_user_has_role(ARRAY['Trabajador'])
    AND EXISTS (
      SELECT 1
      FROM public.perfiles AS p
      JOIN public.trabajadores AS t
        ON t.auth_user_id = p.id
      JOIN public.orden_asignaciones AS oa
        ON oa.trabajador_id = t.id
      WHERE p.id = auth.uid()
        AND p.activo IS TRUE
        AND t.auth_user_id = auth.uid()
        AND oa.orden_id = p_order_id
        AND oa.estado IS DISTINCT FROM 'cancelado'
    );
$$;

REVOKE EXECUTE
  ON FUNCTION private.current_user_assigned_to_order(uuid)
  FROM PUBLIC, anon;

GRANT EXECUTE
  ON FUNCTION private.current_user_assigned_to_order(uuid)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.worker_save_report(
  p_report_id uuid,
  p_order_id uuid,
  p_notas text,
  p_firma_url text,
  p_horas_trabajadas numeric,
  p_fotos_urls text[],
  p_trabajo_realizado text,
  p_material_utilizado text,
  p_facturas_urls text[],
  p_fecha_trabajo date
)
RETURNS TABLE (
  report_id uuid,
  order_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current_status text;
  v_target_status text;
  v_report_id uuid;
  v_report_technician_id uuid;
  v_report_order_id uuid;
  v_affected_rows integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  IF NOT private.current_user_has_role(ARRAY['Trabajador']) THEN
    RAISE EXCEPTION 'An active Trabajador profile is required';
  END IF;

  IF NOT private.current_user_assigned_to_order(p_order_id) THEN
    RAISE EXCEPTION 'The worker is not assigned to this order';
  END IF;

  SELECT o.estado
  INTO v_current_status
  FROM public.ordenes AS o
  WHERE o.id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_current_status IN ('Finalizada', 'Finalizado', 'Archivado') THEN
    RAISE EXCEPTION 'Reports cannot be saved for a closed order';
  END IF;

  v_target_status :=
    CASE
      WHEN NULLIF(btrim(p_firma_url), '') IS NOT NULL
        THEN 'En revisión'
      ELSE 'En Curso'
    END;

  IF v_target_status = 'En Curso'
     AND (
       v_current_status IS NULL
       OR v_current_status NOT IN ('Pendiente', 'Urgente', 'En Curso')
     ) THEN
    RAISE EXCEPTION
      'Invalid order transition from % to %',
      v_current_status,
      v_target_status;
  END IF;

  IF v_target_status = 'En revisión'
     AND (
       v_current_status IS NULL
       OR v_current_status NOT IN (
         'Pendiente',
         'Urgente',
         'En Curso',
         'Pendiente de firma',
         'En revisión'
       )
     ) THEN
    RAISE EXCEPTION
      'Invalid order transition from % to %',
      v_current_status,
      v_target_status;
  END IF;

  IF p_horas_trabajadas IS NOT NULL
     AND (
       p_horas_trabajadas < 0
       OR p_horas_trabajadas::text = 'NaN'
     ) THEN
    RAISE EXCEPTION 'Worked hours must be a non-negative number';
  END IF;

  IF p_report_id IS NULL THEN
    INSERT INTO public.reportes (
      orden_id,
      tecnico_id,
      notas,
      firma_url,
      horas_trabajadas,
      fotos_urls,
      trabajo_realizado,
      material_utilizado,
      facturas_urls,
      fecha_trabajo
    )
    VALUES (
      p_order_id,
      auth.uid(),
      p_notas,
      NULLIF(btrim(p_firma_url), ''),
      p_horas_trabajadas,
      p_fotos_urls,
      p_trabajo_realizado,
      p_material_utilizado,
      p_facturas_urls,
      p_fecha_trabajo
    )
    RETURNING public.reportes.id
    INTO v_report_id;

    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  ELSE
    SELECT r.id, r.tecnico_id, r.orden_id
    INTO v_report_id, v_report_technician_id, v_report_order_id
    FROM public.reportes AS r
    WHERE r.id = p_report_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Report not found';
    END IF;

    IF v_report_technician_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Only the report owner can edit this report';
    END IF;

    IF v_report_order_id IS DISTINCT FROM p_order_id THEN
      RAISE EXCEPTION 'The report does not belong to the supplied order';
    END IF;

    UPDATE public.reportes AS r
    SET notas = p_notas,
        firma_url = NULLIF(btrim(p_firma_url), ''),
        horas_trabajadas = p_horas_trabajadas,
        fotos_urls = p_fotos_urls,
        trabajo_realizado = p_trabajo_realizado,
        material_utilizado = p_material_utilizado,
        facturas_urls = p_facturas_urls,
        fecha_trabajo = p_fecha_trabajo
    WHERE r.id = p_report_id;

    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  END IF;

  IF v_affected_rows <> 1 OR v_report_id IS NULL THEN
    RAISE EXCEPTION 'Exactly one report must be saved';
  END IF;

  UPDATE public.ordenes AS o
  SET estado = v_target_status
  WHERE o.id = p_order_id;

  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;

  IF v_affected_rows <> 1 THEN
    RAISE EXCEPTION 'Exactly one order must be updated';
  END IF;

  RETURN QUERY
  SELECT v_report_id, v_target_status;
END;
$$;

REVOKE EXECUTE
  ON FUNCTION public.worker_save_report(
    uuid,
    uuid,
    text,
    text,
    numeric,
    text[],
    text,
    text,
    text[],
    date
  )
  FROM PUBLIC, anon;

GRANT EXECUTE
  ON FUNCTION public.worker_save_report(
    uuid,
    uuid,
    text,
    text,
    numeric,
    text[],
    text,
    text,
    text[],
    date
  )
  TO authenticated, service_role;

COMMENT ON FUNCTION public.worker_save_report(
  uuid,
  uuid,
  text,
  text,
  numeric,
  text[],
  text,
  text,
  text[],
  date
) IS
  'Creates or edits a worker-owned report for an assigned order and performs a validated order-status transition.';

COMMIT;
