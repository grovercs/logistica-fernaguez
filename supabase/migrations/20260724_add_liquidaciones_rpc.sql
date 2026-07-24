BEGIN;

-- Returns only the report, order, technician name, and hourly rate fields
-- required by Liquidaciones. Access is limited to active Administrador and
-- Editor profiles.
CREATE OR REPLACE FUNCTION public.get_liquidaciones_reportes()
RETURNS TABLE (
  reporte_id uuid,
  orden_id uuid,
  tecnico_id uuid,
  horas_trabajadas numeric,
  creado_en timestamp with time zone,
  fecha_trabajo date,
  estado_liquidacion text,
  id_legible text,
  cliente text,
  estado_orden text,
  nombre_completo text,
  tarifa_hora numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required'
      USING ERRCODE = '42501';
  END IF;

  IF NOT private.current_user_has_role(
    ARRAY['Administrador', 'Editor']
  ) THEN
    RAISE EXCEPTION
      'An active Administrador or Editor profile is required'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    r.id AS reporte_id,
    r.orden_id,
    r.tecnico_id,
    r.horas_trabajadas,
    r.creado_en,
    r.fecha_trabajo,
    r.estado_liquidacion,
    o.id_legible,
    o.cliente,
    o.estado AS estado_orden,
    COALESCE(
      p.nombre_completo,
      worker.nombre_completo,
      'Desconocido'
    ) AS nombre_completo,
    COALESCE(p.tarifa_hora, 0::numeric) AS tarifa_hora
  FROM public.reportes AS r
  INNER JOIN public.ordenes AS o
    ON o.id = r.orden_id
  LEFT JOIN public.perfiles AS p
    ON p.id = r.tecnico_id
  LEFT JOIN LATERAL (
    SELECT
      NULLIF(
        btrim(
          COALESCE(t.nombre, '')
          || ' '
          || COALESCE(t.apellidos, '')
        ),
        ''
      ) AS nombre_completo
    FROM public.trabajadores AS t
    WHERE t.auth_user_id = r.tecnico_id
    ORDER BY t.id
    LIMIT 1
  ) AS worker
    ON TRUE
  ORDER BY r.creado_en DESC;
END;
$$;

REVOKE EXECUTE
  ON FUNCTION public.get_liquidaciones_reportes()
  FROM PUBLIC, anon;

GRANT EXECUTE
  ON FUNCTION public.get_liquidaciones_reportes()
  TO authenticated, service_role;

COMMENT ON FUNCTION public.get_liquidaciones_reportes() IS
  'Returns the report, order, technician name, and hourly rate fields required by Liquidaciones. Restricted to active Administrador and Editor profiles.';

COMMIT;
