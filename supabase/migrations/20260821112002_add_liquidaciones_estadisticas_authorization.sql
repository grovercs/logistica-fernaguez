-- =====================================================
-- MIGRACIÓN: Autorización independiente para Estadísticas de Liquidaciones
-- Fecha: 2026-08-21 11:20:02
--
-- Propósito:
--   Separar el permiso de acceso a Estadísticas del permiso de acceso al
--   módulo completo de Liquidaciones, de forma que Belén pueda ver
--   Estadísticas sin poder operar Liquidaciones.
--
-- Regla funcional:
--   - Liquidaciones (gestión, impresión, cierre, etc.): Grover y Javier.
--   - Estadísticas: Belén, Grover y Javier.
--
-- Cambios:
--   1. Crea private.liquidaciones_estadisticas_autorizado.
--   2. Añade la función de autorización correspondiente.
--   3. Crea public.get_liquidaciones_estadisticas_access() para que el frontend
--      pueda comprobar acceso sin llamar a get_liquidaciones_reportes.
--   4. Modifica get_liquidaciones_reportes para usar la nueva autorización
--      en lugar de restringir por rol genérico.
--   5. Mantiene intacto private.liquidaciones_autorizado y sus RPCs.
-- =====================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Tabla de autorización explícita para Estadísticas
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS private.liquidaciones_estadisticas_autorizado (
  auth_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  creado_en timestamptz NOT NULL DEFAULT now(),
  creado_por uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE private.liquidaciones_estadisticas_autorizado IS
  'Identidades de auth.users autorizadas a ver Estadísticas de Liquidaciones.';

-- ---------------------------------------------------------------------------
-- 2. Seed inicial de autorización
-- ---------------------------------------------------------------------------

INSERT INTO private.liquidaciones_estadisticas_autorizado (auth_user_id)
VALUES
  ('568435d7-2246-4421-95bf-2c63003a8867'), -- Javier Fernández
  ('f319212b-5bae-49df-9e12-2c02fe0f6a88'), -- Grover
  ('60b5655e-067e-4eef-aac8-6772f27678c8')  -- Belén Ballesteros
ON CONFLICT (auth_user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Función de autorización para Estadísticas
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.current_user_is_liquidaciones_estadisticas_autorizado()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM private.liquidaciones_estadisticas_autorizado AS lea
    WHERE lea.auth_user_id = auth.uid()
  );
$$;

REVOKE EXECUTE ON FUNCTION private.current_user_is_liquidaciones_estadisticas_autorizado()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.current_user_is_liquidaciones_estadisticas_autorizado()
  TO service_role;

-- ---------------------------------------------------------------------------
-- 4. RPC booleana de acceso a Estadísticas para el frontend
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_liquidaciones_estadisticas_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.current_user_is_liquidaciones_estadisticas_autorizado();
$$;

REVOKE EXECUTE ON FUNCTION public.get_liquidaciones_estadisticas_access()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_liquidaciones_estadisticas_access()
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. Actualizar get_liquidaciones_reportes para usar autorización explícita
-- ---------------------------------------------------------------------------

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

  IF NOT private.current_user_is_liquidaciones_estadisticas_autorizado() THEN
    RAISE EXCEPTION
      'No estás autorizado a ver las estadísticas de liquidaciones'
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

COMMIT;
