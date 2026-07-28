BEGIN;

ALTER TABLE public.reportes
  ADD COLUMN IF NOT EXISTS asignacion_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint AS c
    JOIN pg_catalog.pg_class AS t
      ON t.oid = c.conrelid
    JOIN pg_catalog.pg_namespace AS n
      ON n.oid = t.relnamespace
    WHERE c.conname = 'reportes_asignacion_id_fkey'
      AND n.nspname = 'public'
      AND t.relname = 'reportes'
  ) THEN
    ALTER TABLE public.reportes
      ADD CONSTRAINT reportes_asignacion_id_fkey
      FOREIGN KEY (asignacion_id)
      REFERENCES public.orden_asignaciones(id)
      ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_reportes_asignacion_id
  ON public.reportes(asignacion_id);

COMMENT ON COLUMN public.reportes.asignacion_id IS
  'Optional assignment associated with a report. NULL preserves historical reports.';

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
  p_fecha_trabajo date,
  p_asignacion_id uuid,
  p_completar_asignacion boolean DEFAULT false
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
  v_report_assignment_id uuid;
  v_assignment_status text;
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

  IF p_horas_trabajadas IS NOT NULL
     AND (
       p_horas_trabajadas < 0
       OR p_horas_trabajadas::text = 'NaN'
     ) THEN
    RAISE EXCEPTION 'Worked hours must be a non-negative number';
  END IF;

  IF p_report_id IS NULL THEN
    IF p_asignacion_id IS NULL THEN
      RAISE EXCEPTION 'An assignment is required for a new report';
    END IF;

    SELECT oa.estado
    INTO v_assignment_status
    FROM public.orden_asignaciones AS oa
    JOIN public.trabajadores AS t
      ON t.id = oa.trabajador_id
    WHERE oa.id = p_asignacion_id
      AND oa.orden_id = p_order_id
      AND t.auth_user_id = auth.uid()
    FOR UPDATE OF oa;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'The assignment does not belong to this worker and order';
    END IF;

    IF v_assignment_status NOT IN ('pendiente', 'en_progreso') THEN
      RAISE EXCEPTION 'New reports require an active assignment';
    END IF;
  ELSE
    SELECT
      r.id,
      r.tecnico_id,
      r.orden_id,
      r.asignacion_id
    INTO
      v_report_id,
      v_report_technician_id,
      v_report_order_id,
      v_report_assignment_id
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

    IF v_report_assignment_id IS NULL THEN
      IF p_asignacion_id IS NOT NULL THEN
        RAISE EXCEPTION 'Historical reports cannot be linked to an assignment';
      END IF;
    ELSIF p_asignacion_id IS DISTINCT FROM v_report_assignment_id THEN
      RAISE EXCEPTION 'The assignment of an existing report cannot be changed';
    END IF;

    IF v_report_assignment_id IS NOT NULL THEN
      SELECT oa.estado
      INTO v_assignment_status
      FROM public.orden_asignaciones AS oa
      JOIN public.trabajadores AS t
        ON t.id = oa.trabajador_id
      WHERE oa.id = v_report_assignment_id
        AND oa.orden_id = p_order_id
        AND t.auth_user_id = auth.uid()
      FOR UPDATE OF oa;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'The report assignment does not belong to this worker and order';
      END IF;

      IF v_assignment_status = 'cancelado' THEN
        RAISE EXCEPTION 'Reports for a cancelled assignment cannot be edited';
      END IF;
    END IF;
  END IF;

  IF p_completar_asignacion
     AND (
       p_asignacion_id IS NULL
       OR (
         p_report_id IS NOT NULL
         AND v_report_assignment_id IS NULL
       )
     ) THEN
    RAISE EXCEPTION 'An associated assignment is required for completion';
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
      WHEN v_current_status = 'En revisión'
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

  IF p_report_id IS NULL THEN
    INSERT INTO public.reportes (
      orden_id,
      tecnico_id,
      asignacion_id,
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
      p_asignacion_id,
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

  IF p_completar_asignacion THEN
    UPDATE public.orden_asignaciones AS oa
    SET estado = 'completado'
    WHERE oa.id = p_asignacion_id
      AND oa.orden_id = p_order_id
      AND oa.estado IN ('pendiente', 'en_progreso');

    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;

    IF v_affected_rows <> 1 THEN
      RAISE EXCEPTION 'Exactly one active assignment must be completed';
    END IF;
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
    date,
    uuid,
    boolean
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
    date,
    uuid,
    boolean
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
  date,
  uuid,
  boolean
) IS
  'Creates or edits a worker-owned report for a validated assignment and optionally completes only that assignment.';

COMMIT;
