BEGIN;

-- =====================================================
-- MIGRACIÓN: Modelo V1 FINAL de Liquidaciones
-- Fecha: 2026-08-18
--
-- Tablas:
--   - public.liquidaciones
--   - public.liquidacion_lineas
--   - public.liquidacion_bonus
--
-- Principios:
--   - Una liquidación por trabajador + periodo mensual.
--   - Las líneas guardan snapshot de horas y fecha de trabajo.
--   - liquidacion_lineas.reporte_id con UNIQUE(reporte_id) es la única
--     fuente de verdad de pertenencia reporte-liquidación.
--   - No se añade reportes.liquidacion_id en esta fase.
--   - La tarifa se captura al abrir, es editable en abierta y se congela
--     al cerrar.
--   - importe_manual NULL = automático; con valor = manual.
--   - Los importes calculados se persisten para lectura rápida.
--   - Acceso exclusivo para el usuario autorizado en
--     private.liquidaciones_autorizado (auth.uid()).
--   - Sin acceso directo a las tablas financieras para authenticated.
--   - Todas las lecturas y mutaciones vía RPC SECURITY DEFINER.
-- =====================================================

-- ---------------------------------------------------------------------------
-- 0. Schema privado
-- ---------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS private;

-- ---------------------------------------------------------------------------
-- 1. Tablas
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.liquidaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trabajador_id uuid NOT NULL REFERENCES public.trabajadores(id) ON DELETE RESTRICT,
  periodo date NOT NULL CHECK (periodo = DATE_TRUNC('month', periodo)::date),
  estado text NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta', 'cerrada')),

  horas_totales numeric(10,2) NOT NULL DEFAULT 0 CHECK (horas_totales >= 0),
  tarifa_hora numeric(10,2) NOT NULL DEFAULT 0 CHECK (tarifa_hora >= 0),
  importe_calculado numeric(12,2) NOT NULL DEFAULT 0 CHECK (importe_calculado >= 0),
  importe_manual numeric(12,2) NULL CHECK (importe_manual IS NULL OR importe_manual >= 0),
  importe_aplicado numeric(12,2) NOT NULL DEFAULT 0 CHECK (importe_aplicado >= 0),
  total_bonus numeric(12,2) NOT NULL DEFAULT 0 CHECK (total_bonus >= 0),
  importe_nomina numeric(12,2) NOT NULL DEFAULT 0 CHECK (importe_nomina >= 0),
  total_liquidar numeric(12,2) NOT NULL DEFAULT 0,

  observaciones text NULL,

  creado_por uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  abierta_en timestamptz NOT NULL DEFAULT now(),
  cerrada_en timestamptz NULL,
  actualizado_en timestamptz NOT NULL DEFAULT now(),

  UNIQUE (trabajador_id, periodo)
);

COMMENT ON TABLE public.liquidaciones IS
  'Resumen mensual de liquidación por trabajador.';
COMMENT ON COLUMN public.liquidaciones.periodo IS
  'Primer día del mes liquidado (YYYY-MM-01). Garantizado por CHECK.';
COMMENT ON COLUMN public.liquidaciones.importe_manual IS
  'NULL = automático (importe_aplicado = importe_calculado). Con valor = manual.';
COMMENT ON COLUMN public.liquidaciones.tarifa_hora IS
  'Tarifa capturada al abrir la liquidación. Editable en abierta, congelada al cerrar.';
COMMENT ON COLUMN public.liquidaciones.total_liquidar IS
  'Puede ser negativo si importe_aplicado + bonus < nómina. No tiene CHECK >= 0 por decisión de negocio.';

-- ---------------------------------------------------------------------------
-- 2. Tabla liquidacion_lineas
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.liquidacion_lineas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  liquidacion_id uuid NOT NULL REFERENCES public.liquidaciones(id) ON DELETE CASCADE,
  reporte_id uuid NOT NULL REFERENCES public.reportes(id) ON DELETE RESTRICT,
  horas_snapshot numeric(10,2) NOT NULL CHECK (horas_snapshot >= 0),
  fecha_trabajo_snapshot date NOT NULL,

  UNIQUE (reporte_id)
);

COMMENT ON TABLE public.liquidacion_lineas IS
  'Reportes incluidos en una liquidación con snapshot de horas y fecha de trabajo.';
COMMENT ON COLUMN public.liquidacion_lineas.horas_snapshot IS
  'Horas del reporte en el momento del recálculo/creación.';
COMMENT ON COLUMN public.liquidacion_lineas.fecha_trabajo_snapshot IS
  'Fecha de trabajo del reporte en el momento del recálculo/creación.';

-- ---------------------------------------------------------------------------
-- 3. Tabla liquidacion_bonus
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.liquidacion_bonus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  liquidacion_id uuid NOT NULL REFERENCES public.liquidaciones(id) ON DELETE CASCADE,
  orden_id uuid NULL REFERENCES public.ordenes(id) ON DELETE SET NULL,
  concepto text NOT NULL CHECK (btrim(concepto) <> ''),
  importe numeric(12,2) NOT NULL DEFAULT 0 CHECK (importe >= 0),
  creado_por uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  creado_en timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.liquidacion_bonus IS
  'Bonus asociados a una liquidación, opcionalmente vinculados a una obra.';
COMMENT ON COLUMN public.liquidacion_bonus.concepto IS
  'No permite texto vacío ni solo espacios.';

-- ---------------------------------------------------------------------------
-- 4. Índices
-- ---------------------------------------------------------------------------
--
-- Se elimina idx_liquidaciones_trabajador_periodo porque UNIQUE ya cubre
-- la búsqueda por (trabajador_id, periodo).
--

CREATE INDEX IF NOT EXISTS idx_liquidaciones_estado
  ON public.liquidaciones (estado);

CREATE INDEX IF NOT EXISTS idx_liquidacion_lineas_liquidacion_id
  ON public.liquidacion_lineas (liquidacion_id);

CREATE INDEX IF NOT EXISTS idx_liquidacion_bonus_liquidacion_id
  ON public.liquidacion_bonus (liquidacion_id);

-- ---------------------------------------------------------------------------
-- 5. Trigger actualizado_en
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_liquidacion_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_liquidacion ON public.liquidaciones;

CREATE TRIGGER trigger_update_liquidacion
  BEFORE UPDATE ON public.liquidaciones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_liquidacion_timestamp();

-- ---------------------------------------------------------------------------
-- 6. RLS
--
-- Sin acceso directo para authenticated. Toda interacción mediante RPCs
-- SECURITY DEFINER del módulo Liquidaciones, autorizadas por identidad
-- (private.current_user_is_liquidaciones_autorizado).
-- service_role mantiene sus privilegios por defecto y bypassa RLS; no se
-- requieren grants adicionales para ella.
-- ---------------------------------------------------------------------------

ALTER TABLE public.liquidaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liquidacion_lineas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liquidacion_bonus ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "liquidaciones_select_admin_editor" ON public.liquidaciones;
DROP POLICY IF EXISTS "liquidaciones_no_direct_write" ON public.liquidaciones;
DROP POLICY IF EXISTS "liquidaciones_no_client_access" ON public.liquidaciones;

CREATE POLICY "liquidaciones_no_client_access"
  ON public.liquidaciones
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "liquidacion_lineas_select_admin_editor" ON public.liquidacion_lineas;
DROP POLICY IF EXISTS "liquidacion_lineas_no_direct_write" ON public.liquidacion_lineas;
DROP POLICY IF EXISTS "liquidacion_lineas_no_client_access" ON public.liquidacion_lineas;

CREATE POLICY "liquidacion_lineas_no_client_access"
  ON public.liquidacion_lineas
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "liquidacion_bonus_select_admin_editor" ON public.liquidacion_bonus;
DROP POLICY IF EXISTS "liquidacion_bonus_no_direct_write" ON public.liquidacion_bonus;
DROP POLICY IF EXISTS "liquidacion_bonus_no_client_access" ON public.liquidacion_bonus;

CREATE POLICY "liquidacion_bonus_no_client_access"
  ON public.liquidacion_bonus
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- Ningún acceso directo para anon ni authenticated.
REVOKE ALL PRIVILEGES ON TABLE public.liquidaciones, public.liquidacion_lineas, public.liquidacion_bonus
  FROM anon;

REVOKE ALL PRIVILEGES ON TABLE public.liquidaciones, public.liquidacion_lineas, public.liquidacion_bonus
  FROM authenticated;

-- ---------------------------------------------------------------------------
-- 7. Autorización por identidad de usuario
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS private.liquidaciones_autorizado (
  auth_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  creado_en timestamptz NOT NULL DEFAULT now(),
  creado_por uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE private.liquidaciones_autorizado IS
  'Identidades de auth.users autorizadas a operar el módulo Liquidaciones. No se expone al cliente.';

-- ---------------------------------------------------------------------------
-- 7.1 Seed inicial de autorización
--
-- Se insertan los dos usuarios designados por el cliente:
--   - Javier Fernández
--   - Grover (administrador del proyecto)
-- Belén Ballesteros es Administradora general pero NO está autorizada al
-- módulo Liquidaciones. El campo creado_por se deja NULL porque la
-- autorización se siembra desde la migración; no existe un actor autenticado.
-- ---------------------------------------------------------------------------

INSERT INTO private.liquidaciones_autorizado (auth_user_id)
VALUES
  ('568435d7-2246-4421-95bf-2c63003a8867'), -- Javier Fernández
  ('f319212b-5bae-49df-9e12-2c02fe0f6a88')  -- Grover
ON CONFLICT (auth_user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION private.current_user_is_liquidaciones_autorizado()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM private.liquidaciones_autorizado AS la
    WHERE la.auth_user_id = auth.uid()
  );
$$;

REVOKE EXECUTE ON FUNCTION private.current_user_is_liquidaciones_autorizado()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.current_user_is_liquidaciones_autorizado()
  TO service_role;

-- ---------------------------------------------------------------------------
-- 8. Helper interno de resolución de tarifa
--
-- Se migra a private.resolve_tarifa_hora para no exponerlo como RPC cliente.
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.resolve_tarifa_hora(uuid);

CREATE OR REPLACE FUNCTION private.resolve_tarifa_hora(p_trabajador_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_auth_user_id uuid;
  v_perfil_tarifa numeric;
  v_worker_tarifa numeric;
BEGIN
  SELECT t.auth_user_id, t.tarifa_hora
  INTO v_auth_user_id, v_worker_tarifa
  FROM public.trabajadores AS t
  WHERE t.id = p_trabajador_id;

  IF v_auth_user_id IS NOT NULL THEN
    SELECT p.tarifa_hora
    INTO v_perfil_tarifa
    FROM public.perfiles AS p
    WHERE p.id = v_auth_user_id;
  END IF;

  RETURN CASE
    WHEN v_perfil_tarifa IS NOT NULL AND v_perfil_tarifa <> 0
      THEN v_perfil_tarifa
    ELSE COALESCE(v_worker_tarifa, 0::numeric)
  END;
END;
$$;

REVOKE EXECUTE ON FUNCTION private.resolve_tarifa_hora(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.resolve_tarifa_hora(uuid)
  TO service_role;

COMMENT ON FUNCTION private.resolve_tarifa_hora(uuid) IS
  'Resuelve la tarifa horaria de un trabajador: perfiles primero, trabajadores fallback, 0 final. Helper interno.';

-- ---------------------------------------------------------------------------
-- 9. RPCs del módulo Liquidaciones
-- ---------------------------------------------------------------------------

-- Recalcular liquidación (solo estado abierta)
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

-- Generar liquidación
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

  -- Normalizar periodo al primer día del mes
  v_periodo := DATE_TRUNC('month', p_periodo)::date;

  -- Evitar duplicado
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
      creado_por
    ) VALUES (
      p_trabajador_id,
      v_periodo,
      'abierta',
      v_tarifa,
      auth.uid()
    )
    RETURNING id INTO v_liquidacion_id;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'LIQUIDACION_ALREADY_EXISTS';
  END;

  -- Insertar líneas iniciales con snapshots y recalcular totales
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

  -- Recalcular totales
  RETURN QUERY
  SELECT * FROM public.admin_recalcular_liquidacion(v_liquidacion_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_generar_liquidacion(uuid, date)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_generar_liquidacion(uuid, date)
  TO authenticated, service_role;

-- Actualizar campos editables de una liquidación abierta
CREATE OR REPLACE FUNCTION public.admin_update_liquidacion(
  p_liquidacion_id uuid,
  p_tarifa_hora numeric DEFAULT NULL,
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

REVOKE EXECUTE ON FUNCTION public.admin_update_liquidacion(uuid, numeric, boolean, numeric, numeric, boolean, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_liquidacion(uuid, numeric, boolean, numeric, numeric, boolean, text)
  TO authenticated, service_role;

-- Añadir bonus
CREATE OR REPLACE FUNCTION public.admin_agregar_bonus(
  p_liquidacion_id uuid,
  p_concepto text,
  p_importe numeric,
  p_orden_id uuid DEFAULT NULL
)
RETURNS TABLE (
  bonus_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_liq public.liquidaciones%ROWTYPE;
  v_bonus_id uuid;
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

  IF NULLIF(btrim(p_concepto), '') IS NULL THEN
    RAISE EXCEPTION 'BONUS_CONCEPTO_REQUIRED';
  END IF;

  IF p_importe < 0 THEN
    RAISE EXCEPTION 'BONUS_IMPORTE_NEGATIVO';
  END IF;

  INSERT INTO public.liquidacion_bonus (
    liquidacion_id,
    orden_id,
    concepto,
    importe,
    creado_por
  ) VALUES (
    p_liquidacion_id,
    p_orden_id,
    p_concepto,
    p_importe,
    auth.uid()
  )
  RETURNING id INTO v_bonus_id;

  PERFORM public.admin_recalcular_liquidacion(p_liquidacion_id);

  RETURN QUERY SELECT v_bonus_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_agregar_bonus(uuid, text, numeric, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_agregar_bonus(uuid, text, numeric, uuid)
  TO authenticated, service_role;

-- Actualizar bonus
CREATE OR REPLACE FUNCTION public.admin_update_liquidacion_bonus(
  p_bonus_id uuid,
  p_set_orden_id boolean DEFAULT false,
  p_orden_id uuid DEFAULT NULL,
  p_set_concepto boolean DEFAULT false,
  p_concepto text DEFAULT NULL,
  p_set_importe boolean DEFAULT false,
  p_importe numeric DEFAULT NULL
)
RETURNS TABLE (
  bonus_id uuid,
  liquidacion_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_bonus public.liquidacion_bonus%ROWTYPE;
  v_liq public.liquidaciones%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF NOT private.current_user_is_liquidaciones_autorizado() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_bonus
  FROM public.liquidacion_bonus AS lb
  WHERE lb.id = p_bonus_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BONUS_NOT_FOUND';
  END IF;

  SELECT *
  INTO v_liq
  FROM public.liquidaciones AS l
  WHERE l.id = v_bonus.liquidacion_id
  FOR UPDATE;

  IF v_liq.estado <> 'abierta' THEN
    RAISE EXCEPTION 'LIQUIDACION_NOT_OPEN';
  END IF;

  IF p_set_concepto AND NULLIF(btrim(p_concepto), '') IS NULL THEN
    RAISE EXCEPTION 'BONUS_CONCEPTO_REQUIRED';
  END IF;

  IF p_set_importe AND p_importe < 0 THEN
    RAISE EXCEPTION 'BONUS_IMPORTE_NEGATIVO';
  END IF;

  UPDATE public.liquidacion_bonus AS lb
  SET
    orden_id = CASE
      WHEN p_set_orden_id THEN p_orden_id
      ELSE lb.orden_id
    END,
    concepto = CASE
      WHEN p_set_concepto THEN p_concepto
      ELSE lb.concepto
    END,
    importe = CASE
      WHEN p_set_importe THEN p_importe
      ELSE lb.importe
    END
  WHERE lb.id = p_bonus_id;

  PERFORM public.admin_recalcular_liquidacion(v_bonus.liquidacion_id);

  RETURN QUERY SELECT p_bonus_id, v_bonus.liquidacion_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_liquidacion_bonus(uuid, boolean, uuid, boolean, text, boolean, numeric)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_liquidacion_bonus(uuid, boolean, uuid, boolean, text, boolean, numeric)
  TO authenticated, service_role;

-- Eliminar bonus
CREATE OR REPLACE FUNCTION public.admin_eliminar_bonus(p_bonus_id uuid)
RETURNS TABLE (
  bonus_id uuid,
  liquidacion_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_bonus public.liquidacion_bonus%ROWTYPE;
  v_liq public.liquidaciones%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF NOT private.current_user_is_liquidaciones_autorizado() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_bonus
  FROM public.liquidacion_bonus AS lb
  WHERE lb.id = p_bonus_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BONUS_NOT_FOUND';
  END IF;

  SELECT *
  INTO v_liq
  FROM public.liquidaciones AS l
  WHERE l.id = v_bonus.liquidacion_id
  FOR UPDATE;

  IF v_liq.estado <> 'abierta' THEN
    RAISE EXCEPTION 'LIQUIDACION_NOT_OPEN';
  END IF;

  DELETE FROM public.liquidacion_bonus AS lb
  WHERE lb.id = p_bonus_id;

  PERFORM public.admin_recalcular_liquidacion(v_bonus.liquidacion_id);

  RETURN QUERY SELECT p_bonus_id, v_bonus.liquidacion_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_eliminar_bonus(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_eliminar_bonus(uuid)
  TO authenticated, service_role;

-- Cerrar liquidación
CREATE OR REPLACE FUNCTION public.admin_cerrar_liquidacion(p_liquidacion_id uuid)
RETURNS TABLE (
  liquidacion_id uuid,
  estado text,
  cerrada_en timestamptz,
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

  IF v_liq.estado <> 'abierta' THEN
    RAISE EXCEPTION 'LIQUIDACION_NOT_OPEN';
  END IF;

  -- Refrescar snapshots, añadir reportes válidos pendientes del mes y
  -- calcular totales finales dentro de la transacción.
  PERFORM public.admin_recalcular_liquidacion(p_liquidacion_id);

  UPDATE public.liquidaciones AS l
  SET
    estado = 'cerrada',
    cerrada_en = now()
  WHERE l.id = p_liquidacion_id;

  SELECT *
  INTO v_liq
  FROM public.liquidaciones AS l
  WHERE l.id = p_liquidacion_id;

  RETURN QUERY
  SELECT
    v_liq.id,
    v_liq.estado,
    v_liq.cerrada_en,
    v_liq.horas_totales,
    v_liq.tarifa_hora,
    v_liq.importe_calculado,
    v_liq.importe_aplicado,
    v_liq.total_bonus,
    v_liq.importe_nomina,
    v_liq.total_liquidar;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_cerrar_liquidacion(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_cerrar_liquidacion(uuid)
  TO authenticated, service_role;

-- Listado/consulta del nuevo modelo
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
-- 10. Contratos / tests estáticos de seguridad del modelo
--
-- Se ejecutan dentro de la migración. Son lecturas de catálogo; no mutan
-- datos. Fallan con RAISE EXCEPTION si el modelo no cumple los contratos.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_rec RECORD;
  v_count integer;
BEGIN
  -- a) Las tres tablas no deben permitir SELECT a authenticated.
  IF has_table_privilege('authenticated', 'public.liquidaciones', 'SELECT') THEN
    RAISE EXCEPTION 'CONTRACT_FAIL: authenticated tiene SELECT sobre public.liquidaciones';
  END IF;
  IF has_table_privilege('authenticated', 'public.liquidacion_lineas', 'SELECT') THEN
    RAISE EXCEPTION 'CONTRACT_FAIL: authenticated tiene SELECT sobre public.liquidacion_lineas';
  END IF;
  IF has_table_privilege('authenticated', 'public.liquidacion_bonus', 'SELECT') THEN
    RAISE EXCEPTION 'CONTRACT_FAIL: authenticated tiene SELECT sobre public.liquidacion_bonus';
  END IF;

  -- b) Las tres tablas tienen RLS habilitado.
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relname = 'liquidaciones') THEN
    RAISE EXCEPTION 'CONTRACT_FAIL: RLS no está habilitado en public.liquidaciones';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relname = 'liquidacion_lineas') THEN
    RAISE EXCEPTION 'CONTRACT_FAIL: RLS no está habilitado en public.liquidacion_lineas';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relname = 'liquidacion_bonus') THEN
    RAISE EXCEPTION 'CONTRACT_FAIL: RLS no está habilitado en public.liquidacion_bonus';
  END IF;

  -- c) private.current_user_is_liquidaciones_autorizado() NO es ejecutable
  --    directamente por authenticated ni anon; solo por service_role (las RPC
  --    SECURITY DEFINER la invocan internamente).
  IF has_function_privilege('authenticated', 'private.current_user_is_liquidaciones_autorizado()', 'EXECUTE') THEN
    RAISE EXCEPTION 'CONTRACT_FAIL: authenticated puede ejecutar directamente current_user_is_liquidaciones_autorizado';
  END IF;
  IF has_function_privilege('anon', 'private.current_user_is_liquidaciones_autorizado()', 'EXECUTE') THEN
    RAISE EXCEPTION 'CONTRACT_FAIL: anon puede ejecutar directamente current_user_is_liquidaciones_autorizado';
  END IF;
  IF NOT has_function_privilege('service_role', 'private.current_user_is_liquidaciones_autorizado()', 'EXECUTE') THEN
    RAISE EXCEPTION 'CONTRACT_FAIL: service_role no puede ejecutar current_user_is_liquidaciones_autorizado';
  END IF;

  -- d) resolve_tarifa_hora no está expuesto en el schema public.
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc AS p
    JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'resolve_tarifa_hora'
  ) THEN
    RAISE EXCEPTION 'CONTRACT_FAIL: resolve_tarifa_hora sigue expuesto en public';
  END IF;

  -- e) Las RPCs públicas son SECURITY DEFINER con SET search_path = '',
  --    ejecutables por authenticated y no por anon.
  FOR v_rec IN
    SELECT
      p.oid,
      p.proname,
      p.prosecdef,
      p.proconfig,
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_catalog.pg_proc AS p
    JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'admin_get_liquidaciones',
        'admin_generar_liquidacion',
        'admin_recalcular_liquidacion',
        'admin_update_liquidacion',
        'admin_agregar_bonus',
        'admin_update_liquidacion_bonus',
        'admin_eliminar_bonus',
        'admin_cerrar_liquidacion'
      )
  LOOP
    IF NOT v_rec.prosecdef THEN
      RAISE EXCEPTION 'CONTRACT_FAIL: % no es SECURITY DEFINER', v_rec.proname;
    END IF;
    IF v_rec.proconfig IS NULL OR NOT (v_rec.proconfig @> ARRAY['search_path=""']) THEN
      RAISE EXCEPTION 'CONTRACT_FAIL: % no fuerza search_path=', v_rec.proname;
    END IF;
    IF NOT has_function_privilege('authenticated', v_rec.oid::regprocedure, 'EXECUTE') THEN
      RAISE EXCEPTION 'CONTRACT_FAIL: authenticated no puede ejecutar %', v_rec.proname;
    END IF;
    IF has_function_privilege('anon', v_rec.oid::regprocedure, 'EXECUTE') THEN
      RAISE EXCEPTION 'CONTRACT_FAIL: anon puede ejecutar %', v_rec.proname;
    END IF;
  END LOOP;

  -- f) private.resolve_tarifa_hora no es ejecutable por authenticated.
  IF has_function_privilege('authenticated', 'private.resolve_tarifa_hora(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'CONTRACT_FAIL: authenticated puede ejecutar private.resolve_tarifa_hora';
  END IF;

  -- g) Constraint de periodo primer día de mes existe en public.liquidaciones.
  SELECT COUNT(*) INTO v_count
  FROM pg_catalog.pg_constraint AS c
  JOIN pg_catalog.pg_class AS t ON t.oid = c.conrelid
  JOIN pg_catalog.pg_namespace AS n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'liquidaciones'
    AND c.contype = 'c'
    AND pg_get_expr(c.conbin, c.conrelid) LIKE '%date_trunc(%month%';

  IF v_count = 0 THEN
    RAISE EXCEPTION 'CONTRACT_FAIL: falta CHECK de periodo primer día de mes en public.liquidaciones';
  END IF;
END;
$$;

COMMIT;

-- ===========================================================================
-- NOTAS POST-MIGRACIÓN (no se ejecutan automáticamente)
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- A. Identificar al usuario autorizado
-- ---------------------------------------------------------------------------
--
-- Ejecutar en SQL Editor con service_role (o con un rol que pueda leer
-- auth.users). NO insertar UUID inventado; el cliente debe indicar cuál es.
--
-- Datos devueltos para identificar inequívocamente al usuario:
--   - auth_user_id (UUID de auth.users)
--   - email
--   - nombre_completo del perfil
--   - rol
--   - activo
--   - trabajador vinculado (nombre + apellidos)
--
-- Consulta:
--
--   SELECT
--     u.id AS auth_user_id,
--     u.email,
--     p.nombre_completo,
--     r.nombre AS rol,
--     p.activo,
--     t.id AS trabajador_id,
--     t.nombre AS trabajador_nombre,
--     t.apellidos AS trabajador_apellidos
--   FROM auth.users AS u
--   LEFT JOIN public.perfiles AS p ON p.id = u.id
--   LEFT JOIN public.roles AS r ON r.id = p.rol_id
--   LEFT JOIN public.trabajadores AS t ON t.auth_user_id = u.id
--   ORDER BY u.email;
--
-- Una vez identificado, insertar manualmente:
--
--   INSERT INTO private.liquidaciones_autorizado (auth_user_id)
--   VALUES ('UUID-AQUI');
--
-- ---------------------------------------------------------------------------
-- B. Tests manuales recomendados tras autorizar al usuario
-- ---------------------------------------------------------------------------
--
-- 1. Usuario no autorizado → FORBIDDEN
--    SELECT * FROM public.admin_get_liquidaciones();
--    (debe lanzar error 42501 / FORBIDDEN)
--
-- 2. Usuario autorizado puede listar
--    SELECT * FROM public.admin_get_liquidaciones(p_limit := 10);
--
-- 3. Generar liquidación para trabajador sin auth_user_id → TRABAJADOR_AUTH_NOT_LINKED
--    SELECT * FROM public.admin_generar_liquidacion('uuid-trabajador-sin-auth', '2026-08-18');
--
-- 4. Generar liquidación válida
--    SELECT * FROM public.admin_generar_liquidacion('uuid-trabajador-con-auth', '2026-08-18');
--
-- 5. Bonus con concepto vacío o solo espacios → BONUS_CONCEPTO_REQUIRED
--    SELECT * FROM public.admin_agregar_bonus('uuid-liquidacion', '   ', 100);
--
-- 6. Bonus con importe negativo → BONUS_IMPORTE_NEGATIVO
--    SELECT * FROM public.admin_agregar_bonus('uuid-liquidacion', 'Extra', -10);
--
-- 7. Volver a automático (importe_manual = NULL)
--    SELECT * FROM public.admin_update_liquidacion(
--      'uuid-liquidacion',
--      p_set_importe_manual := true,
--      p_importe_manual := NULL
--    );
--
-- 8. Establecer importe manual
--    SELECT * FROM public.admin_update_liquidacion(
--      'uuid-liquidacion',
--      p_set_importe_manual := true,
--      p_importe_manual := 1500.00
--    );
--
-- 9. Borrar observaciones
--    SELECT * FROM public.admin_update_liquidacion(
--      'uuid-liquidacion',
--      p_set_observaciones := true,
--      p_observaciones := NULL
--    );
--
-- 10. Desvincular bonus de obra (orden_id = NULL)
--     SELECT * FROM public.admin_update_liquidacion_bonus(
--       'uuid-bonus',
--       p_set_orden_id := true,
--       p_orden_id := NULL
--     );
--
-- 11. Periodo se normaliza al día 1
--     Verificar que la fila creada tenga periodo = '2026-08-01'.
--
-- 12. Órdenes Archivado incluidas; órdenes Papelera excluidas
--     Crear reportes con ordenes en ambos estados y comprobar líneas.
--
-- 13. total_liquidar negativo permitido
--     Establecer importe_nomina > importe_aplicado + bonus y verificar valor negativo.
--
-- 14. UNIQUE reporte_id
--     Intentar generar dos liquidaciones del mismo mes con reportes solapados;
--     debe fallar con REPORT_ALREADY_IN_LIQUIDACION.
--
-- 15. Cierre bloquea edición
--     Llamar admin_cerrar_liquidacion y luego intentar admin_update_liquidacion;
--     debe fallar con LIQUIDACION_NOT_OPEN.
--
