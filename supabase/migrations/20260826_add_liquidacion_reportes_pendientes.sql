-- =====================================================
-- MIGRACIÓN: Aviso de reportes pendientes en liquidaciones abiertas
-- Fecha: 2026-08-26
--
-- Propósito:
--   Crear una RPC de SOLO LECTURA que detecte reportes válidos del
--   trabajador/periodo de una liquidación abierta que aún no estén
--   incluidos en liquidacion_lineas.
--
-- Restricciones:
--   - NO inserta, actualiza ni borra datos.
--   - NO recalcula automáticamente.
--   - Devuelve 0/0 para liquidaciones no abiertas o inexistentes.
--   - Usa exactamente los mismos criterios de inclusión que
--     public.admin_recalcular_liquidacion.
-- =====================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. RPC de solo lectura: reportes pendientes de una liquidación
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_get_liquidacion_reportes_pendientes(
  p_liquidacion_id uuid
)
RETURNS TABLE (
  reportes_pendientes integer,
  horas_pendientes numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_auth_user_id uuid;
  v_periodo date;
  v_estado text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF NOT private.current_user_is_liquidaciones_autorizado() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  SELECT l.periodo, l.estado, t.auth_user_id
  INTO v_periodo, v_estado, v_auth_user_id
  FROM public.liquidaciones AS l
  INNER JOIN public.trabajadores AS t ON t.id = l.trabajador_id
  WHERE l.id = p_liquidacion_id;

  IF NOT FOUND OR v_estado IS DISTINCT FROM 'abierta' OR v_auth_user_id IS NULL THEN
    RETURN QUERY SELECT 0::integer, 0::numeric;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    pg_catalog.count(r.id)::integer AS reportes_pendientes,
    COALESCE(pg_catalog.sum(r.horas_trabajadas), 0)::numeric AS horas_pendientes
  FROM public.reportes AS r
  INNER JOIN public.ordenes AS o ON o.id = r.orden_id
  WHERE r.tecnico_id = v_auth_user_id
    AND r.fecha_trabajo >= v_periodo
    AND r.fecha_trabajo < (v_periodo + INTERVAL '1 month')::date
    AND o.estado <> 'Papelera'
    AND NOT EXISTS (
      SELECT 1
      FROM public.liquidacion_lineas AS ll
      WHERE ll.reporte_id = r.id
    );
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Permisos
-- ---------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.admin_get_liquidacion_reportes_pendientes(uuid)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_get_liquidacion_reportes_pendientes(uuid)
  TO authenticated;

COMMENT ON FUNCTION public.admin_get_liquidacion_reportes_pendientes(uuid) IS
  'Cuenta reportes válidos de una liquidación abierta que aún no están incluidos en liquidacion_lineas. Solo lectura. Usa los mismos filtros que admin_recalcular_liquidacion.';

COMMIT;
