-- =====================================================
-- MIGRACIÓN: Mejoras en módulo Liquidaciones
-- Fecha: 2026-08-19
--
-- Ajustes:
--   1. Añade flag usar_tarifa_puntual en liquidaciones.
--   2. Actualiza admin_get_liquidaciones para devolver el flag.
--   3. Actualiza admin_generar_liquidacion para inicializar el flag.
--   4. Actualiza admin_update_liquidacion para permitir cambiar el flag
--      y la tarifa puntual.
--   5. Crea admin_reabrir_liquidacion para volver de cerrada a abierta.
--   6. Crea admin_actualizar_tarifa_hora_trabajador para editar la tarifa
--      habitual del trabajador desde el módulo de Liquidaciones.
--   7. Mantiene contratos de seguridad existentes.
-- =====================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Nueva columna: flag de tarifa puntual por liquidación
-- ---------------------------------------------------------------------------

ALTER TABLE public.liquidaciones
ADD COLUMN IF NOT EXISTS usar_tarifa_puntual boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.liquidaciones.usar_tarifa_puntual IS
  'TRUE = la tarifa_hora de esta liquidación es una tarifa puntual editada manualmente. FALSE = usa la tarifa capturada al generar (habitual del trabajador en ese momento).';

-- ---------------------------------------------------------------------------
-- 2. Listado: devolver usar_tarifa_puntual
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_get_liquidaciones(
  p_trabajador_id uuid DEFAULT NULL,
  p_periodo date DEFAULT NULL,
  p_estado text DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
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
  cerrada_en timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF NOT private.current_user_is_liquidaciones_autorizado() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.trabajador_id,
    l.periodo,
    l.estado,
    l.horas_totales,
    l.tarifa_hora,
    l.usar_tarifa_puntual,
    l.importe_calculado,
    l.importe_manual,
    l.importe_aplicado,
    l.total_bonus,
    l.importe_nomina,
    l.total_liquidar,
    l.observaciones,
    l.abierta_en,
    l.cerrada_en
  FROM public.liquidaciones AS l
  WHERE (p_trabajador_id IS NULL OR l.trabajador_id = p_trabajador_id)
    AND (p_periodo IS NULL OR l.periodo = p_periodo)
    AND (p_estado IS NULL OR l.estado = p_estado)
  ORDER BY l.periodo DESC, l.abierta_en DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_liquidaciones(uuid, date, text, integer, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_liquidaciones(uuid, date, text, integer, integer)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Generar liquidación: inicializar usar_tarifa_puntual = false
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_generar_liquidacion(
  p_trabajador_id uuid,
  p_periodo date
)
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
  v_periodo date;
  v_liquidacion_id uuid;
  v_tarifa numeric;
  v_auth_user_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF NOT private.current_user_is_liquidaciones_autorizado() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.trabajadores AS t WHERE t.id = p_trabajador_id
  ) THEN
    RAISE EXCEPTION 'TRABAJADOR_NOT_FOUND';
  END IF;

  v_periodo := DATE_TRUNC('month', p_periodo)::date;

  IF EXISTS (
    SELECT 1 FROM public.liquidaciones AS l
    WHERE l.trabajador_id = p_trabajador_id
      AND l.periodo = v_periodo
  ) THEN
    RAISE EXCEPTION 'LIQUIDACION_ALREADY_EXISTS';
  END IF;

  SELECT t.auth_user_id INTO v_auth_user_id
  FROM public.trabajadores AS t
  WHERE t.id = p_trabajador_id;

  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'TRABAJADOR_AUTH_NOT_LINKED';
  END IF;

  v_tarifa := private.resolve_tarifa_hora(p_trabajador_id);

  BEGIN
    INSERT INTO public.liquidaciones (
      trabajador_id,
      periodo,
      estado,
      tarifa_hora,
      usar_tarifa_puntual,
      creado_por
    ) VALUES (
      p_trabajador_id,
      v_periodo,
      'abierta',
      v_tarifa,
      false,
      auth.uid()
    )
    RETURNING id INTO v_liquidacion_id;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'LIQUIDACION_ALREADY_EXISTS';
  END;

  INSERT INTO public.liquidacion_lineas (
    liquidacion_id,
    reporte_id,
    horas_snapshot,
    fecha_trabajo_snapshot
  )
  SELECT
    v_liquidacion_id,
    r.id,
    r.horas_trabajadas,
    r.fecha_trabajo
  FROM public.reportes AS r
  INNER JOIN public.ordenes AS o ON o.id = r.orden_id
  WHERE r.tecnico_id = v_auth_user_id
    AND r.fecha_trabajo >= v_periodo
    AND r.fecha_trabajo < (v_periodo + INTERVAL '1 month')::date
    AND o.estado <> 'Papelera'
    AND NOT EXISTS (
      SELECT 1 FROM public.liquidacion_lineas AS ll
      WHERE ll.reporte_id = r.id
    );

  RETURN QUERY
  SELECT * FROM public.admin_recalcular_liquidacion(v_liquidacion_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_generar_liquidacion(uuid, date)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_generar_liquidacion(uuid, date)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Actualizar liquidación: permitir cambiar flag y tarifa puntual
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_update_liquidacion(
  p_liquidacion_id uuid,
  p_tarifa_hora numeric DEFAULT NULL,
  p_usar_tarifa_puntual boolean DEFAULT NULL,
  p_set_importe_manual boolean DEFAULT false,
  p_importe_manual numeric DEFAULT NULL,
  p_importe_nomina numeric DEFAULT NULL,
  p_set_observaciones boolean DEFAULT false,
  p_observaciones text DEFAULT NULL
)
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

  IF p_set_importe_manual AND p_importe_manual IS NOT NULL AND p_importe_manual < 0 THEN
    RAISE EXCEPTION 'IMPORTE_MANUAL_NEGATIVO';
  END IF;

  UPDATE public.liquidaciones AS l
  SET
    tarifa_hora = COALESCE(p_tarifa_hora, l.tarifa_hora),
    usar_tarifa_puntual = COALESCE(p_usar_tarifa_puntual, l.usar_tarifa_puntual),
    importe_manual = CASE
      WHEN p_set_importe_manual THEN p_importe_manual
      ELSE l.importe_manual
    END,
    importe_nomina = COALESCE(p_importe_nomina, l.importe_nomina),
    observaciones = CASE
      WHEN p_set_observaciones THEN p_observaciones
      ELSE l.observaciones
    END
  WHERE l.id = p_liquidacion_id;

  RETURN QUERY
  SELECT * FROM public.admin_recalcular_liquidacion(p_liquidacion_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_liquidacion(uuid, numeric, boolean, boolean, numeric, numeric, boolean, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_liquidacion(uuid, numeric, boolean, boolean, numeric, numeric, boolean, text)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. Reabrir liquidación cerrada
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_reabrir_liquidacion(p_liquidacion_id uuid)
RETURNS TABLE (
  liquidacion_id uuid,
  estado text,
  abierta_en timestamptz,
  horas_totales numeric,
  tarifa_hora numeric,
  importe_calculado numeric,
  importe_aplicado numeric,
  total_bonus numeric,
  importe_nomina numeric,
  total_liquidar numeric
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

  IF v_liq.estado <> 'cerrada' THEN
    RAISE EXCEPTION 'LIQUIDACION_NOT_CLOSED';
  END IF;

  UPDATE public.liquidaciones AS l
  SET
    estado = 'abierta',
    cerrada_en = NULL
  WHERE l.id = p_liquidacion_id;

  SELECT *
  INTO v_liq
  FROM public.liquidaciones AS l
  WHERE l.id = p_liquidacion_id;

  RETURN QUERY
  SELECT
    v_liq.id,
    v_liq.estado,
    v_liq.abierta_en,
    v_liq.horas_totales,
    v_liq.tarifa_hora,
    v_liq.importe_calculado,
    v_liq.importe_aplicado,
    v_liq.total_bonus,
    v_liq.importe_nomina,
    v_liq.total_liquidar;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_reabrir_liquidacion(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reabrir_liquidacion(uuid)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6. Editar tarifa habitual del trabajador desde Liquidaciones
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_actualizar_tarifa_hora_trabajador(
  p_trabajador_id uuid,
  p_tarifa_hora numeric
)
RETURNS TABLE (
  trabajador_id uuid,
  tarifa_hora numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_auth_user_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF NOT private.current_user_is_liquidaciones_autorizado() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF p_tarifa_hora IS NULL OR p_tarifa_hora < 0 THEN
    RAISE EXCEPTION 'TARIFA_HORA_NEGATIVA';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.trabajadores AS t WHERE t.id = p_trabajador_id
  ) THEN
    RAISE EXCEPTION 'TRABAJADOR_NOT_FOUND';
  END IF;

  UPDATE public.trabajadores AS t
  SET tarifa_hora = p_tarifa_hora
  WHERE t.id = p_trabajador_id
  RETURNING t.auth_user_id INTO v_auth_user_id;

  -- Sincronizar perfiles si el trabajador tiene usuario vinculado
  IF v_auth_user_id IS NOT NULL THEN
    UPDATE public.perfiles AS p
    SET tarifa_hora = p_tarifa_hora
    WHERE p.id = v_auth_user_id;
  END IF;

  RETURN QUERY
  SELECT p_trabajador_id, p_tarifa_hora;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_actualizar_tarifa_hora_trabajador(uuid, numeric)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_actualizar_tarifa_hora_trabajador(uuid, numeric)
  TO authenticated, service_role;

COMMIT;
