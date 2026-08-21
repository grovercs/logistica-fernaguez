-- =====================================================
-- MIGRACIÓN FASE A: Bonus históricos, tarifa capturada y update V2
-- Fecha: 2026-08-21 10:50:18
--
-- Compatible con frontend desplegado actual:
--   - NO se modifica admin_update_liquidacion (firma antigua).
--   - NO se elimina admin_reabrir_liquidacion todavía.
--
-- Cambios:
--   1. Añade tarifa_hora_capturada a public.liquidaciones.
--   2. Inicializa tarifa_hora_capturada con tarifa_hora actual.
--   3. Modifica admin_generar_liquidacion para guardar la tarifa capturada.
--   4. Crea admin_get_liquidacion_bonus para lectura de bonus reales.
--   5. Crea admin_update_liquidacion_v2 con semántica explícita.
-- =====================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Columna de snapshot de tarifa habitual
-- ---------------------------------------------------------------------------

ALTER TABLE public.liquidaciones
ADD COLUMN IF NOT EXISTS tarifa_hora_capturada numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.liquidaciones.tarifa_hora_capturada IS
  'Tarifa habitual resuelda en el momento de generar la liquidación. Se usa para restaurar la tarifa original al desactivar la tarifa puntual.';

-- ---------------------------------------------------------------------------
-- 2. Backfill: copiar tarifa_hora actual como tarifa capturada
--
-- Verificado pre-migración: 0 filas con usar_tarifa_puntual = true.
-- Por tanto tarifa_hora contiene la tarifa habitual original de cada liquidación.
-- ---------------------------------------------------------------------------

UPDATE public.liquidaciones
SET tarifa_hora_capturada = tarifa_hora
WHERE tarifa_hora_capturada = 0;

-- ---------------------------------------------------------------------------
-- 3. Generar liquidación: guardar tarifa capturada junto con tarifa_hora
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
      tarifa_hora_capturada,
      usar_tarifa_puntual,
      creado_por
    ) VALUES (
      p_trabajador_id,
      v_periodo,
      'abierta',
      v_tarifa,
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
-- 4. Leer bonus históricos de una liquidación
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_get_liquidacion_bonus(p_liquidacion_id uuid)
RETURNS TABLE (
  id uuid,
  liquidacion_id uuid,
  concepto text,
  importe numeric,
  orden_id uuid,
  orden_numero text,
  orden_descripcion text,
  creado_en timestamptz
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
    lb.id,
    lb.liquidacion_id,
    lb.concepto,
    lb.importe,
    lb.orden_id,
    COALESCE(o.id_legible, lb.orden_id::text),
    COALESCE(o.nombre_obra, o.descripcion, ''),
    lb.creado_en
  FROM public.liquidacion_bonus AS lb
  LEFT JOIN public.ordenes AS o ON o.id = lb.orden_id
  WHERE lb.liquidacion_id = p_liquidacion_id
  ORDER BY lb.creado_en, lb.id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_liquidacion_bonus(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_liquidacion_bonus(uuid)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. admin_update_liquidacion_v2: semántica explícita, sin romper V1
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_update_liquidacion_v2(
  p_liquidacion_id uuid,
  p_usar_tarifa_puntual boolean DEFAULT NULL,
  p_tarifa_hora numeric DEFAULT NULL,
  p_usar_importe_manual boolean DEFAULT NULL,
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

  IF p_usar_tarifa_puntual IS TRUE AND p_tarifa_hora IS NULL THEN
    RAISE EXCEPTION 'TARIFA_PUNTUAL_REQUERIDA';
  END IF;

  IF p_usar_importe_manual IS TRUE AND p_importe_manual IS NULL THEN
    RAISE EXCEPTION 'IMPORTE_MANUAL_REQUERIDO';
  END IF;

  IF p_importe_manual IS NOT NULL AND p_importe_manual < 0 THEN
    RAISE EXCEPTION 'IMPORTE_MANUAL_NEGATIVO';
  END IF;

  UPDATE public.liquidaciones AS l
  SET
    tarifa_hora = CASE
      WHEN p_usar_tarifa_puntual IS TRUE THEN p_tarifa_hora
      WHEN p_usar_tarifa_puntual IS FALSE THEN v_liq.tarifa_hora_capturada
      ELSE l.tarifa_hora
    END,
    usar_tarifa_puntual = COALESCE(p_usar_tarifa_puntual, l.usar_tarifa_puntual),
    importe_manual = CASE
      WHEN p_usar_importe_manual IS TRUE THEN p_importe_manual
      WHEN p_usar_importe_manual IS FALSE THEN NULL
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

REVOKE EXECUTE ON FUNCTION public.admin_update_liquidacion_v2(
  uuid, boolean, numeric, boolean, numeric, numeric, boolean, text
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_update_liquidacion_v2(
  uuid, boolean, numeric, boolean, numeric, numeric, boolean, text
) TO authenticated, service_role;

COMMIT;
