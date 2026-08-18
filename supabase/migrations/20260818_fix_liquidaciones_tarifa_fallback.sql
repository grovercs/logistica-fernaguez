BEGIN;

-- Fix: resolve hourly rate using the same precedence as Trabajadores.tsx:
--   1. perfiles.tarifa_hora if present and non-zero
--   2. trabajadores.tarifa_hora fallback
--   3. 0 if neither exists
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
    CASE
      WHEN p.tarifa_hora IS NOT NULL AND p.tarifa_hora <> 0
        THEN p.tarifa_hora
      ELSE COALESCE(worker.tarifa_hora, 0::numeric)
    END AS tarifa_hora
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
      ) AS nombre_completo,
      t.tarifa_hora
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
  'Returns the report, order, technician name, and hourly rate fields required by Liquidaciones. Resolves tarifa_hora from perfiles first, then trabajadores fallback. Restricted to active Administrador and Editor profiles.';

COMMIT;
