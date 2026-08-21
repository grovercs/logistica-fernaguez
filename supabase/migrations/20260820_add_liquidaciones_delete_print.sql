-- =====================================================
-- MIGRACIÓN: Borrado e impresión de liquidaciones
-- Fecha: 2026-08-20
--
-- Ajustes:
--   1. Crea admin_eliminar_liquidacion para borrar liquidaciones
--      abiertas (bonus → lineas → liquidación) sin tocar reportes,
--      ordenes, trabajadores ni perfiles.
--   2. Crea admin_get_liquidacion_detalle_impresion para devolver
--      todos los datos necesarios para imprimir/guardar PDF.
--   3. Mantiene contratos de seguridad existentes.
--
-- Nota sobre columnas reales del esquema:
--   - public.trabajadores: nombre, apellidos, especialidad (text).
--   - public.ordenes: id_legible (text), nombre_obra (text), cliente (text),
--     direccion (text), descripcion (text).
--   - public.reportes: orden_id (uuid), horas_trabajadas (numeric),
--     fecha_trabajo (date).
--   - No existe public.clientes.id ni public.ordenes.cliente_id en el esquema
--     actual; por tanto la impresión lee el cliente directamente de ordenes.cliente.
-- =====================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Borrar liquidación (solo si está abierta)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_eliminar_liquidacion(p_liquidacion_id uuid)
RETURNS TABLE (
  liquidacion_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_liq public.liquidaciones%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF NOT private.current_user_is_liquidaciones_autorizado() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_liq
  FROM public.liquidaciones AS l
  WHERE l.id = p_liquidacion_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LIQUIDACION_NOT_FOUND';
  END IF;

  IF v_liq.estado <> 'abierta' THEN
    RAISE EXCEPTION 'LIQUIDACION_NOT_OPEN';
  END IF;

  -- Borrar en orden: bonus dependientes, lineas dependientes, liquidación.
  -- No se tocan reportes, ordenes, trabajadores ni perfiles.
  DELETE FROM public.liquidacion_bonus AS lb
  WHERE lb.liquidacion_id = p_liquidacion_id;

  DELETE FROM public.liquidacion_lineas AS ll
  WHERE ll.liquidacion_id = p_liquidacion_id;

  DELETE FROM public.liquidaciones AS l
  WHERE l.id = p_liquidacion_id;

  RETURN QUERY SELECT p_liquidacion_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_eliminar_liquidacion(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_eliminar_liquidacion(uuid)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Datos completos para imprimir una liquidación
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_get_liquidacion_detalle_impresion(p_liquidacion_id uuid)
RETURNS TABLE (
  -- Liquidación
  id uuid,
  trabajador_id uuid,
  periodo date,
  estado text,
  horas_totales numeric,
  tarifa_hora numeric,
  usar_tarifa_puntual boolean,
  importe_calculado numeric,
  importe_manual numeric,
  importe_aplicado numeric,
  total_bonus numeric,
  importe_nomina numeric,
  total_liquidar numeric,
  observaciones text,
  abierta_en timestamptz,
  cerrada_en timestamptz,
  -- Trabajador
  trabajador_nombre text,
  trabajador_apellidos text,
  trabajador_especialidad text,
  -- Líneas / reportes
  lineas jsonb,
  -- Bonus
  bonus jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_liq public.liquidaciones%ROWTYPE;
  v_trabajador public.trabajadores%ROWTYPE;
  v_lineas jsonb;
  v_bonus jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF NOT private.current_user_is_liquidaciones_autorizado() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_liq
  FROM public.liquidaciones AS l
  WHERE l.id = p_liquidacion_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LIQUIDACION_NOT_FOUND';
  END IF;

  SELECT *
  INTO v_trabajador
  FROM public.trabajadores AS t
  WHERE t.id = v_liq.trabajador_id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'reporte_id', ll.reporte_id,
      'fecha_trabajo', ll.fecha_trabajo_snapshot,
      'horas', ll.horas_snapshot,
      'orden_id', r.orden_id,
      'orden_numero', COALESCE(o.id_legible, r.orden_id::text),
      'orden_descripcion', COALESCE(o.nombre_obra, o.descripcion, ''),
      'cliente_nombre', COALESCE(o.cliente, ''),
      'direccion', COALESCE(o.direccion, '')
    ) ORDER BY ll.fecha_trabajo_snapshot, ll.reporte_id
  ), '[]'::jsonb)
  INTO v_lineas
  FROM public.liquidacion_lineas AS ll
  LEFT JOIN public.reportes AS r ON r.id = ll.reporte_id
  LEFT JOIN public.ordenes AS o ON o.id = r.orden_id
  WHERE ll.liquidacion_id = p_liquidacion_id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', lb.id,
      'concepto', lb.concepto,
      'importe', lb.importe
    ) ORDER BY lb.creado_en, lb.id
  ), '[]'::jsonb)
  INTO v_bonus
  FROM public.liquidacion_bonus AS lb
  WHERE lb.liquidacion_id = p_liquidacion_id;

  RETURN QUERY
  SELECT
    v_liq.id,
    v_liq.trabajador_id,
    v_liq.periodo,
    v_liq.estado,
    v_liq.horas_totales,
    v_liq.tarifa_hora,
    v_liq.usar_tarifa_puntual,
    v_liq.importe_calculado,
    v_liq.importe_manual,
    v_liq.importe_aplicado,
    v_liq.total_bonus,
    v_liq.importe_nomina,
    v_liq.total_liquidar,
    v_liq.observaciones,
    v_liq.abierta_en,
    v_liq.cerrada_en,
    COALESCE(v_trabajador.nombre, ''),
    COALESCE(v_trabajador.apellidos, ''),
    COALESCE(v_trabajador.especialidad, ''),
    v_lineas,
    v_bonus;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_liquidacion_detalle_impresion(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_liquidacion_detalle_impresion(uuid)
  TO authenticated, service_role;

COMMIT;
