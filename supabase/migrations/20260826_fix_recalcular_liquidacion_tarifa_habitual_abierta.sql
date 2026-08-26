-- =====================================================
-- FIX: admin_recalcular_liquidacion usa tarifa habitual actual
-- Fecha: 2026-08-26
--
-- Mientras una liquidación esté ABIERTA y no use tarifa puntual,
-- al recalcular se obtiene la tarifa habitual ACTUAL del trabajador
-- (private.resolve_tarifa_hora) y se actualizan de forma coherente:
--   - tarifa_hora (tarifa usada en el cálculo)
--   - tarifa_hora_capturada (tarifa base/base a restaurar al desactivar
--     la tarifa puntual)
--
-- Esto garantiza que, al cerrar la liquidación, la tarifa histórica
-- congelada coincida con la tarifa real con la que se cierra, y que
-- al reabrirla o desactivar una puntual no vuelva a aparecer una
-- tarifa antigua ya superada.
--
-- Se mantiene:
--   - prioridad de tarifa puntual cuando usar_tarifa_puntual = true
--   - prioridad del importe manual
--   - rechazo de recálculo en liquidaciones no abiertas
-- =====================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_recalcular_liquidacion(p_liquidacion_id uuid)
RETURNS TABLE (
  liquidacion_id uuid,
  horas_totales numeric,
  importe_calculado numeric,
  importe_aplicado numeric,
  total_bonus numeric,
  total_liquidar numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_liq public.liquidaciones%ROWTYPE;
  v_auth_user_id uuid;
  v_horas numeric;
  v_importe_calculado numeric;
  v_total_bonus numeric;
  v_importe_aplicado numeric;
  v_total_liquidar numeric;
  v_reporte RECORD;
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

  -- reportes.tecnico_id es el UUID de auth.users, no trabajadores.id
  SELECT t.auth_user_id
  INTO v_auth_user_id
  FROM public.trabajadores AS t
  WHERE t.id = v_liq.trabajador_id;

  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'TRABAJADOR_AUTH_NOT_LINKED';
  END IF;

  -- Si la liquidación está abierta y no usa tarifa puntual, actualizar la
  -- tarifa usada y la tarifa base/capturada a la tarifa habitual ACTUAL
  -- del trabajador. Ambas deben coincidir mientras no haya tarifa puntual.
  IF v_liq.estado = 'abierta' AND NOT v_liq.usar_tarifa_puntual THEN
    v_liq.tarifa_hora := private.resolve_tarifa_hora(v_liq.trabajador_id);

    UPDATE public.liquidaciones AS l
    SET
      tarifa_hora = v_liq.tarifa_hora,
      tarifa_hora_capturada = v_liq.tarifa_hora
    WHERE l.id = p_liquidacion_id;
  END IF;

  -- Refrescar snapshots de líneas existentes
  UPDATE public.liquidacion_lineas AS ll
  SET
    horas_snapshot = r.horas_trabajadas,
    fecha_trabajo_snapshot = r.fecha_trabajo
  FROM public.reportes AS r
  WHERE ll.reporte_id = r.id
    AND ll.liquidacion_id = p_liquidacion_id;

  -- Detectar e insertar nuevos reportes del mismo trabajador en el mismo mes
  -- que aún no estén en ninguna liquidación. Se incluyen órdenes Archivado;
  -- se excluyen órdenes en Papelera.
  FOR v_reporte IN
    SELECT r.id, r.horas_trabajadas, r.fecha_trabajo
    FROM public.reportes AS r
    INNER JOIN public.ordenes AS o ON o.id = r.orden_id
    WHERE r.tecnico_id = v_auth_user_id
      AND r.fecha_trabajo >= v_liq.periodo
      AND r.fecha_trabajo < (v_liq.periodo + INTERVAL '1 month')::date
      AND o.estado <> 'Papelera'
      AND NOT EXISTS (
        SELECT 1 FROM public.liquidacion_lineas AS ll
        WHERE ll.reporte_id = r.id
      )
  LOOP
    BEGIN
      INSERT INTO public.liquidacion_lineas (
        liquidacion_id,
        reporte_id,
        horas_snapshot,
        fecha_trabajo_snapshot
      ) VALUES (
        p_liquidacion_id,
        v_reporte.id,
        v_reporte.horas_trabajadas,
        v_reporte.fecha_trabajo
      );
    EXCEPTION
      WHEN unique_violation THEN
        RAISE EXCEPTION 'REPORT_ALREADY_IN_LIQUIDACION';
    END;
  END LOOP;

  -- Calcular totales
  SELECT COALESCE(SUM(ll.horas_snapshot), 0)
  INTO v_horas
  FROM public.liquidacion_lineas AS ll
  WHERE ll.liquidacion_id = p_liquidacion_id;

  v_importe_calculado := v_horas * v_liq.tarifa_hora;
  v_importe_aplicado := COALESCE(v_liq.importe_manual, v_importe_calculado);

  SELECT COALESCE(SUM(lb.importe), 0)
  INTO v_total_bonus
  FROM public.liquidacion_bonus AS lb
  WHERE lb.liquidacion_id = p_liquidacion_id;

  v_total_liquidar := v_importe_aplicado + v_total_bonus - v_liq.importe_nomina;

  UPDATE public.liquidaciones AS l
  SET
    horas_totales = v_horas,
    importe_calculado = v_importe_calculado,
    importe_aplicado = v_importe_aplicado,
    total_bonus = v_total_bonus,
    total_liquidar = v_total_liquidar
  WHERE l.id = p_liquidacion_id;

  RETURN QUERY
  SELECT
    p_liquidacion_id,
    v_horas,
    v_importe_calculado,
    v_importe_aplicado,
    v_total_bonus,
    v_total_liquidar;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_recalcular_liquidacion(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_recalcular_liquidacion(uuid)
  TO authenticated, service_role;

COMMIT;
