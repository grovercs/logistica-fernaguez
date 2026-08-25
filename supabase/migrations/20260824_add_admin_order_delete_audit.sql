-- =====================================================
-- MIGRACIÓN: Auditoría universal de borrado de obras/órdenes
-- Fecha: 2026-08-24 (v3)
--
-- Resuelve:
--   1. El borrado de órdenes se hacía desde el frontend en 4 pasos manuales,
--      sin atomicidad ni auditoría unificada.
--   2. `liquidacion_lineas.reporte_id` tiene ON DELETE RESTRICT, por lo que
--      borrar reportes de una orden incluida en liquidaciones falla.
--   3. El UI mostraba el botón de borrado a Editores pero la operación solo
--      debe ser posible para Administradores.
--   4. Necesidad de que CUALQUIER borrado de filas de public.ordenes —vía
--      RPC o vía DELETE directo por un contexto privilegiado— deje SIEMPRE
--      exactamente una fila de auditoría con snapshot completo.
--
-- Arquitectura:
--   - La tabla `public.admin_order_audit_log` almacena el snapshot.
--     `actor_user_id` es uuid NULL y no tiene FK.
--   - El trigger `private.trg_audit_order_delete` es la ÚNICA fuente de
--     inserción en la tabla de auditoría para borrados de obras. Es un
--     `BEFORE DELETE FOR EACH ROW` sobre `public.ordenes`.
--   - La RPC `public.admin_eliminar_ordenes(uuid[], text, text)` NO inserta
--     en auditoría. Solo valida Administrador, Papelera, liquidaciones,
--     recolecta URLs de medios/firmas, establece el contexto transaccional
--     (`app.audit.actor_user_id`, `app.audit.action`, `app.audit.reason`) y
--     ejecuta el `DELETE`.
--   - No existe ninguna variable que desactive la auditoría. La única manera
--     de no dejar auditoría es evitar que el DELETE se produzca.
--   - `REVOKE DELETE ON public.ordenes FROM PUBLIC, anon, authenticated`
--     cierra el borrado directo para roles normales.
-- =====================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Tabla de auditoría
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.admin_order_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NULL,              -- sin FK: referencia lógica, no relación física
  db_session_user text NOT NULL DEFAULT CURRENT_USER,
  actor_name text NULL,
  actor_email text NULL,
  actor_role text NULL,
  target_order_id uuid NULL,            -- sin FK: la obra se borra; el UUID se conserva aquí y en old_values
  action text NOT NULL CHECK (action IN ('hard_delete_order', 'empty_trash', 'direct_delete')),
  old_values jsonb NOT NULL,
  new_values jsonb NOT NULL DEFAULT jsonb_build_object('deleted', true),
  reason text NULL,
  success boolean NOT NULL DEFAULT true,
  error_message text NULL CHECK (error_message IS NULL OR char_length(error_message) <= 500),
  deleted_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.admin_order_audit_log IS
  'Auditoría inmutable de borrado de obras. Cada fila se inserta exclusivamente por el trigger BEFORE DELETE FOR EACH ROW de public.ordenes; nunca por la RPC ni por DELETE directo sin pasar por el trigger.';

CREATE INDEX IF NOT EXISTS admin_order_audit_log_deleted_at_idx
  ON public.admin_order_audit_log (deleted_at DESC);

CREATE INDEX IF NOT EXISTS admin_order_audit_log_target_order_id_idx
  ON public.admin_order_audit_log (target_order_id);

CREATE INDEX IF NOT EXISTS admin_order_audit_log_actor_user_id_idx
  ON public.admin_order_audit_log (actor_user_id);

-- ---------------------------------------------------------------------------
-- 2. RLS y permisos de la tabla de auditoría
-- ---------------------------------------------------------------------------

ALTER TABLE public.admin_order_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Administradores leen auditoria de obras"
  ON public.admin_order_audit_log;

CREATE POLICY "Administradores leen auditoria de obras"
  ON public.admin_order_audit_log
  FOR SELECT
  TO authenticated
  USING (private.current_user_has_role(ARRAY['Administrador']::text[]));

REVOKE ALL PRIVILEGES ON TABLE public.admin_order_audit_log FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.admin_order_audit_log FROM authenticated;

GRANT SELECT ON TABLE public.admin_order_audit_log TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Cierre del borrado directo sobre public.ordenes
-- ---------------------------------------------------------------------------

-- 3.1 Revocar privilegio de DELETE a cualquier rol de aplicación.
--     La RPC SECURITY DEFINER ejecuta el borrado con los privilegios del
--     propietario de la función.
REVOKE DELETE ON TABLE public.ordenes FROM PUBLIC;
REVOKE DELETE ON TABLE public.ordenes FROM anon;
REVOKE DELETE ON TABLE public.ordenes FROM authenticated;

-- ---------------------------------------------------------------------------
-- 4. Trigger universal de auditoría antes del borrado
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.trg_audit_order_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_text text;
  v_actor uuid;
  v_action text;
  v_reason text;
  v_reportes jsonb;
  v_asignaciones jsonb;
  v_snapshot jsonb;
  v_role text;
  v_name text;
  v_email text;
BEGIN
  -- Leer contexto transaccional establecido por la RPC, si existe.
  -- Si no existe, se asume un DELETE directo privilegiado.
  v_actor_text := pg_catalog.current_setting('app.audit.actor_user_id', true);
  v_actor := NULLIF(v_actor_text, '')::uuid;
  IF v_actor IS NULL THEN
    v_actor := auth.uid();
  END IF;

  v_action := COALESCE(NULLIF(pg_catalog.current_setting('app.audit.action', true), ''), 'direct_delete');
  v_reason := NULLIF(pg_catalog.current_setting('app.audit.reason', true), '');

  -- Snapshot completo de la orden y sus dependencias.
  -- Las filas hijas aún existen porque las acciones referenciales (CASCADE)
  -- se ejecutan DESPUÉS de los triggers BEFORE DELETE FOR EACH ROW.
  SELECT COALESCE(pg_catalog.jsonb_agg(r.*), '[]'::jsonb)
  INTO v_reportes
  FROM public.reportes AS r
  WHERE r.orden_id = OLD.id;

  SELECT COALESCE(pg_catalog.jsonb_agg(a.*), '[]'::jsonb)
  INTO v_asignaciones
  FROM public.orden_asignaciones AS a
  WHERE a.orden_id = OLD.id;

  v_snapshot := pg_catalog.jsonb_build_object(
    'orden', pg_catalog.to_jsonb(OLD),
    'reportes', v_reportes,
    'asignaciones', v_asignaciones
  );

  -- Intentar enriquecer con datos del actor desde tablas de aplicación.
  -- Si alguna lectura falla (p. ej. permisos insuficientes sobre auth.users),
  -- se deja NULL; la auditoría nunca debe fallar por esto.
  v_role := NULL;
  v_name := NULL;
  v_email := NULL;
  IF v_actor IS NOT NULL THEN
    BEGIN
      SELECT rol.nombre INTO v_role
      FROM public.perfiles AS perfil
      INNER JOIN public.roles AS rol ON rol.id = perfil.rol_id
      WHERE perfil.id = v_actor
        AND perfil.activo = true
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      v_role := NULL;
    END;

    BEGIN
      SELECT p.nombre_completo INTO v_name
      FROM public.perfiles AS p
      WHERE p.id = v_actor
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      v_name := NULL;
    END;

    BEGIN
      SELECT u.email INTO v_email
      FROM auth.users AS u
      WHERE u.id = v_actor;
    EXCEPTION WHEN OTHERS THEN
      v_email := NULL;
    END;
  END IF;

  INSERT INTO public.admin_order_audit_log (
    actor_user_id,
    db_session_user,
    actor_name,
    actor_email,
    actor_role,
    target_order_id,
    action,
    old_values,
    new_values,
    reason,
    success
  ) VALUES (
    v_actor,
    SESSION_USER,
    v_name,
    v_email,
    v_role,
    OLD.id,
    v_action,
    v_snapshot,
    pg_catalog.jsonb_build_object('deleted', true, 'deleted_at', now()),
    v_reason,
    true
  );

  RETURN OLD;
END;
$$;

REVOKE EXECUTE ON FUNCTION private.trg_audit_order_delete()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_ordenes_audit_delete ON public.ordenes;

CREATE TRIGGER trg_ordenes_audit_delete
  BEFORE DELETE ON public.ordenes
  FOR EACH ROW
  EXECUTE FUNCTION private.trg_audit_order_delete();

-- ---------------------------------------------------------------------------
-- 5. Función pública de borrado atómico de obras
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_eliminar_ordenes(
  p_order_ids uuid[],
  p_reason text DEFAULT NULL,
  p_action text DEFAULT 'hard_delete_order'
)
RETURNS TABLE (
  deleted_count integer,
  media_urls text[],
  firma_urls text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid;
  v_requested_count integer;
  v_distinct_count integer;
  v_found_count integer;
  v_not_trash_count integer;
  v_media_urls text[] := '{}';
  v_firma_urls text[] := '{}';
  v_blocking jsonb;
  v_blocking_count integer;
  v_deleted_count integer;
BEGIN
  v_actor := auth.uid();

  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE = '28000';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.perfiles AS perfil
    INNER JOIN public.roles AS rol ON rol.id = perfil.rol_id
    WHERE perfil.id = v_actor
      AND perfil.activo = true
      AND rol.nombre = 'Administrador'
  ) THEN
    RAISE EXCEPTION 'ADMINISTRATOR_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF p_action IS NULL OR p_action NOT IN ('hard_delete_order', 'empty_trash') THEN
    RAISE EXCEPTION 'INVALID_ACTION' USING ERRCODE = '22023';
  END IF;

  IF p_order_ids IS NULL
    OR pg_catalog.array_length(p_order_ids, 1) IS NULL
    OR pg_catalog.array_position(p_order_ids, NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'ORDER_IDS_REQUIRED' USING ERRCODE = '22023';
  END IF;

  SELECT pg_catalog.count(*), pg_catalog.count(DISTINCT selected_order_id)
  INTO v_requested_count, v_distinct_count
  FROM pg_catalog.unnest(p_order_ids) AS selected_order_id;

  IF v_requested_count <> v_distinct_count THEN
    RAISE EXCEPTION 'DUPLICATE_ORDER_IDS' USING ERRCODE = '22023';
  END IF;

  -- Bloqueo de filas para evitar carreras
  PERFORM 1
  FROM public.ordenes
  WHERE id = ANY(p_order_ids)
  ORDER BY id
  FOR UPDATE;

  SELECT pg_catalog.count(*)
  INTO v_found_count
  FROM public.ordenes
  WHERE id = ANY(p_order_ids);

  IF v_found_count <> v_requested_count THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  SELECT pg_catalog.count(*)
  INTO v_not_trash_count
  FROM public.ordenes
  WHERE id = ANY(p_order_ids)
    AND estado <> 'Papelera';

  IF v_not_trash_count <> 0 THEN
    RAISE EXCEPTION 'ORDERS_NOT_IN_TRASH' USING ERRCODE = 'P0001';
  END IF;

  -- Detectar reportes de estas órdenes incluidos en liquidaciones
  SELECT
    COALESCE(pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'liquidacion_id', l.id,
        'trabajador_id', l.trabajador_id,
        'periodo', l.periodo,
        'estado', l.estado,
        'reporte_id', r.id,
        'orden_id', r.orden_id
      )
    ), '[]'::jsonb),
    pg_catalog.count(*)
  INTO v_blocking, v_blocking_count
  FROM public.liquidacion_lineas AS ll
  INNER JOIN public.reportes AS r ON r.id = ll.reporte_id
  INNER JOIN public.liquidaciones AS l ON l.id = ll.liquidacion_id
  WHERE r.orden_id = ANY(p_order_ids);

  IF v_blocking_count <> 0 THEN
    RAISE EXCEPTION 'ORDERS_BLOCKED_BY_LIQUIDACIONES:%', v_blocking::text
      USING ERRCODE = 'P0001';
  END IF;

  -- Recolectar URLs de medios (Cloudinary) y firmas (tratadas por separado)
  SELECT COALESCE(pg_catalog.array_agg(url), '{}'::text[])
  INTO v_media_urls
  FROM (
    SELECT unnest(r.fotos_urls) AS url
    FROM public.reportes AS r
    WHERE r.orden_id = ANY(p_order_ids)
      AND r.fotos_urls IS NOT NULL
    UNION ALL
    SELECT unnest(r.facturas_urls) AS url
    FROM public.reportes AS r
    WHERE r.orden_id = ANY(p_order_ids)
      AND r.facturas_urls IS NOT NULL
  ) AS urls;

  SELECT COALESCE(pg_catalog.array_agg(r.firma_url), '{}'::text[])
  INTO v_firma_urls
  FROM public.reportes AS r
  WHERE r.orden_id = ANY(p_order_ids)
    AND r.firma_url IS NOT NULL;

  -- Establecer contexto transaccional para el trigger de auditoría.
  -- No hay variable que desactive la auditoría; solo metadatos.
  PERFORM pg_catalog.set_config('app.audit.actor_user_id', v_actor::text, true);
  PERFORM pg_catalog.set_config('app.audit.action', p_action, true);
  PERFORM pg_catalog.set_config('app.audit.reason', p_reason, true);

  DELETE FROM public.ordenes
  WHERE id = ANY(p_order_ids);

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Limpiar el contexto para no contaminar operaciones posteriores en la misma transacción.
  PERFORM pg_catalog.set_config('app.audit.actor_user_id', '', true);
  PERFORM pg_catalog.set_config('app.audit.action', '', true);
  PERFORM pg_catalog.set_config('app.audit.reason', '', true);

  RETURN QUERY SELECT v_deleted_count, COALESCE(v_media_urls, '{}'::text[]), COALESCE(v_firma_urls, '{}'::text[]);
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Permisos de la función
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.admin_eliminar_ordenes(uuid[], text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_eliminar_ordenes(uuid[], text, text) FROM anon;

GRANT EXECUTE ON FUNCTION public.admin_eliminar_ordenes(uuid[], text, text)
  TO authenticated;

COMMENT ON FUNCTION public.admin_eliminar_ordenes(uuid[], text, text) IS
  'Borra obras de forma atómica solo para Administradores, solo desde Papelera, verificando que no estén en liquidaciones. La auditoría la realiza el trigger BEFORE DELETE de public.ordenes; esta función no inserta directamente en admin_order_audit_log.';

-- ---------------------------------------------------------------------------
-- 7. Contract tests estáticos
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_rec RECORD;
  v_count integer;
  v_funcdef text;
  v_trigdef text;
  v_trigtype smallint;
BEGIN
  -- a) La tabla de auditoría existe y tiene RLS habilitado.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class AS c
    JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'admin_order_audit_log' AND c.relkind = 'r'
  ) THEN
    RAISE EXCEPTION 'CONTRACT_FAIL: no existe public.admin_order_audit_log';
  END IF;

  IF NOT (SELECT relrowsecurity FROM pg_catalog.pg_class AS c
          JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public' AND c.relname = 'admin_order_audit_log') THEN
    RAISE EXCEPTION 'CONTRACT_FAIL: RLS no está habilitado en public.admin_order_audit_log';
  END IF;

  -- b) actor_user_id NO tiene FK hacia auth.users.
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint AS c
    JOIN pg_catalog.pg_class AS t ON t.oid = c.conrelid
    JOIN pg_catalog.pg_namespace AS n ON n.oid = t.relnamespace
    JOIN pg_catalog.pg_attribute AS a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
    WHERE n.nspname = 'public'
      AND t.relname = 'admin_order_audit_log'
      AND c.contype = 'f'
      AND a.attname = 'actor_user_id'
  ) THEN
    RAISE EXCEPTION 'CONTRACT_FAIL: actor_user_id tiene FK hacia auth.users';
  END IF;

  -- c) authenticated no tiene privilegios de escritura directa sobre auditoría.
  IF has_table_privilege('authenticated', 'public.admin_order_audit_log', 'INSERT') THEN
    RAISE EXCEPTION 'CONTRACT_FAIL: authenticated tiene INSERT sobre public.admin_order_audit_log';
  END IF;
  IF has_table_privilege('authenticated', 'public.admin_order_audit_log', 'UPDATE') THEN
    RAISE EXCEPTION 'CONTRACT_FAIL: authenticated tiene UPDATE sobre public.admin_order_audit_log';
  END IF;
  IF has_table_privilege('authenticated', 'public.admin_order_audit_log', 'DELETE') THEN
    RAISE EXCEPTION 'CONTRACT_FAIL: authenticated tiene DELETE sobre public.admin_order_audit_log';
  END IF;

  -- d) authenticated, anon y PUBLIC no tienen DELETE directo sobre public.ordenes.
  IF has_table_privilege('authenticated', 'public.ordenes', 'DELETE') THEN
    RAISE EXCEPTION 'CONTRACT_FAIL: authenticated tiene DELETE directo sobre public.ordenes';
  END IF;
  IF has_table_privilege('anon', 'public.ordenes', 'DELETE') THEN
    RAISE EXCEPTION 'CONTRACT_FAIL: anon tiene DELETE directo sobre public.ordenes';
  END IF;

  -- e) La función es SECURITY DEFINER con search_path vacío.
  SELECT p.prosecdef, p.proconfig, p.oid
  INTO v_rec
  FROM pg_catalog.pg_proc AS p
  JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'admin_eliminar_ordenes';

  IF v_rec IS NULL THEN
    RAISE EXCEPTION 'CONTRACT_FAIL: no existe public.admin_eliminar_ordenes';
  END IF;

  IF NOT v_rec.prosecdef THEN
    RAISE EXCEPTION 'CONTRACT_FAIL: admin_eliminar_ordenes no es SECURITY DEFINER';
  END IF;

  IF v_rec.proconfig IS NULL OR NOT (v_rec.proconfig @> ARRAY['search_path=""']) THEN
    RAISE EXCEPTION 'CONTRACT_FAIL: admin_eliminar_ordenes no fuerza search_path=';
  END IF;

  v_funcdef := pg_catalog.pg_get_functiondef(v_rec.oid);

  -- f) La RPC NO inserta directamente en la auditoría.
  IF v_funcdef ILIKE '%INSERT INTO public.admin_order_audit_log%' THEN
    RAISE EXCEPTION 'CONTRACT_FAIL: admin_eliminar_ordenes inserta directamente en auditoría';
  END IF;

  -- g) La función devuelve media_urls y firma_urls separadas.
  IF v_funcdef NOT ILIKE '%media_urls text[]%' THEN
    RAISE EXCEPTION 'CONTRACT_FAIL: admin_eliminar_ordenes no devuelve media_urls text[]';
  END IF;
  IF v_funcdef NOT ILIKE '%firma_urls text[]%' THEN
    RAISE EXCEPTION 'CONTRACT_FAIL: admin_eliminar_ordenes no devuelve firma_urls text[]';
  END IF;

  -- h) La función establece contexto transaccional para el trigger.
  IF v_funcdef NOT ILIKE '%set_config(''app.audit.actor_user_id'',%' THEN
    RAISE EXCEPTION 'CONTRACT_FAIL: admin_eliminar_ordenes no establece app.audit.actor_user_id';
  END IF;
  IF v_funcdef NOT ILIKE '%set_config(''app.audit.action'',%' THEN
    RAISE EXCEPTION 'CONTRACT_FAIL: admin_eliminar_ordenes no establece app.audit.action';
  END IF;

  -- i) No existe variable que desactive la auditoría.
  IF v_funcdef ILIKE '%set_config(''app.allow_order_delete'',%' THEN
    RAISE EXCEPTION 'CONTRACT_FAIL: admin_eliminar_ordenes puede desactivar la auditoría';
  END IF;

  -- j) La función es ejecutable por authenticated y no por anon.
  IF NOT has_function_privilege('authenticated', 'public.admin_eliminar_ordenes(uuid[], text, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'CONTRACT_FAIL: authenticated no puede ejecutar admin_eliminar_ordenes';
  END IF;

  IF has_function_privilege('anon', 'public.admin_eliminar_ordenes(uuid[], text, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'CONTRACT_FAIL: anon puede ejecutar admin_eliminar_ordenes';
  END IF;

  -- k) Existe trigger BEFORE DELETE FOR EACH ROW sobre public.ordenes que apunta a la función de auditoría.
  SELECT tr.tgtype
  INTO v_trigtype
  FROM pg_catalog.pg_trigger AS tr
  JOIN pg_catalog.pg_class AS t ON t.oid = tr.tgrelid
  JOIN pg_catalog.pg_namespace AS n ON n.oid = t.relnamespace
  JOIN pg_catalog.pg_proc AS p ON p.oid = tr.tgfoid
  JOIN pg_catalog.pg_namespace AS pn ON pn.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'ordenes'
    AND NOT tr.tgisinternal
    AND pn.nspname = 'private'
    AND p.proname = 'trg_audit_order_delete';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CONTRACT_FAIL: no existe trigger de auditoría sobre public.ordenes';
  END IF;

  -- tgtype bits: row=1, before=2, insert=4, delete=8, update=16, truncate=32.
  IF (v_trigtype & 1) <> 1 THEN
    RAISE EXCEPTION 'CONTRACT_FAIL: el trigger de auditoría no es FOR EACH ROW';
  END IF;
  IF (v_trigtype & 2) <> 2 THEN
    RAISE EXCEPTION 'CONTRACT_FAIL: el trigger de auditoría no es BEFORE';
  END IF;
  IF (v_trigtype & 8) <> 8 THEN
    RAISE EXCEPTION 'CONTRACT_FAIL: el trigger de auditoría no es DELETE';
  END IF;

  -- l) La función del trigger realiza la auditoría.
  SELECT pg_catalog.pg_get_functiondef(p.oid)
  INTO v_trigdef
  FROM pg_catalog.pg_proc AS p
  JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
  WHERE n.nspname = 'private' AND p.proname = 'trg_audit_order_delete';

  IF v_trigdef NOT ILIKE '%INSERT INTO public.admin_order_audit_log%' THEN
    RAISE EXCEPTION 'CONTRACT_FAIL: el trigger no inserta en public.admin_order_audit_log';
  END IF;

  -- m) El CHECK de action incluye los tres valores esperados.
  SELECT pg_catalog.count(*) INTO v_count
  FROM pg_catalog.pg_constraint AS c
  JOIN pg_catalog.pg_class AS t ON t.oid = c.conrelid
  JOIN pg_catalog.pg_namespace AS n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'admin_order_audit_log'
    AND c.contype = 'c'
    AND pg_get_expr(c.conbin, c.conrelid) LIKE '%direct_delete%';

  IF v_count = 0 THEN
    RAISE EXCEPTION 'CONTRACT_FAIL: falta CHECK de action con direct_delete';
  END IF;

  -- n) La tabla no expone INSERT/UPDATE/DELETE a anon.
  IF has_table_privilege('anon', 'public.admin_order_audit_log', 'INSERT') THEN
    RAISE EXCEPTION 'CONTRACT_FAIL: anon tiene INSERT sobre public.admin_order_audit_log';
  END IF;
END;
$$;

COMMIT;

-- ===========================================================================
-- NOTAS POST-MIGRACIÓN (no se ejecutan automáticamente)
-- ===========================================================================
--
-- 1. Manual de pruebas recomendadas:
--
--    a) Usuario no autenticado:
--       SELECT * FROM public.admin_eliminar_ordenes(ARRAY['uuid-orden']::uuid[]);
--       → AUTHENTICATION_REQUIRED
--
--    b) Usuario autenticado no administrador:
--       → ADMINISTRATOR_REQUIRED
--
--    c) Orden no existe:
--       → ORDER_NOT_FOUND
--
--    d) Orden no está en Papelera:
--       → ORDERS_NOT_IN_TRASH
--
--    e) Orden con reporte en liquidación:
--       → ORDERS_BLOCKED_BY_LIQUIDACIONES:{...}
--
--    f) Borrado directo intentado por authenticated:
--       DELETE FROM public.ordenes WHERE id = 'uuid-orden-papelera';
--       → ERROR: permission denied for table ordenes
--
--    g) Borrado válido mediante RPC:
--       SELECT * FROM public.admin_eliminar_ordenes(
--         ARRAY['uuid-orden-papelera']::uuid[],
--         'Motivo de prueba'
--       );
--       → deleted_count = 1, media_urls = [...], firma_urls = [...]
--       Verificar que la orden ya no existe y que existe exactamente una fila
--       en public.admin_order_audit_log con action = 'hard_delete_order'.
--
--    h) Vaciar papelera con N órdenes:
--       SELECT * FROM public.admin_eliminar_ordenes(
--         ARRAY['uuid-1','uuid-2']::uuid[],
--         'Vaciado de papelera',
--         'empty_trash'
--       );
--       → deleted_count = 2 y exactamente 2 filas en auditoría con
--       action = 'empty_trash'.
--
--    i) DELETE directo privilegiado (p. ej. como postgres):
--       SET LOCAL app.audit.action = 'direct_delete';
--       SET LOCAL app.audit.reason = 'Limpieza manual';
--       DELETE FROM public.ordenes WHERE id = 'uuid-orden-papelera';
--       → Debe producir exactamente una fila en auditoría con
--       action = 'direct_delete' y db_session_user = 'postgres'.
--
--    j) No es posible desactivar la auditoría:
--       No existe ninguna variable de configuración que impida que el trigger
--       inserte en public.admin_order_audit_log.
--
-- 2. La función solo borra de la base de datos. El borrado de medios en
--    Cloudinary debe invocarse desde el frontend con las URLs devueltas en
--    media_urls, reutilizando la Edge Function 'delete-cloudinary-images'.
--    Las firmas (firma_urls) se devuelen por separado para su tratamiento
--    posterior según el almacén donde se guarden.
--
-- 3. Si en el futuro se desea borrar medios automáticamente desde el backend,
--    se recomienda una segunda Edge Function/Netlify Function separada que
--    coordine la transacción, nunca exponer el API secret de Cloudinary
--    directamente en PostgreSQL.
