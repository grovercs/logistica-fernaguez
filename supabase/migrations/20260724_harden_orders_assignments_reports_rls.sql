BEGIN;

-- Phase 2: RLS hardening. Depends on the private helper functions created by
-- 20260724_add_worker_report_rpc.sql.

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------

ALTER TABLE public.ordenes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver ordenes"
  ON public.ordenes;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear ordenes"
  ON public.ordenes;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar ordenes"
  ON public.ordenes;
DROP POLICY IF EXISTS "Usuarios autenticados pueden borrar ordenes"
  ON public.ordenes;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver órdenes"
  ON public.ordenes;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear órdenes"
  ON public.ordenes;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar órdenes"
  ON public.ordenes;
DROP POLICY IF EXISTS "Usuarios autenticados pueden borrar órdenes"
  ON public.ordenes;

DROP POLICY IF EXISTS "Roles autorizados leen ordenes"
  ON public.ordenes;
DROP POLICY IF EXISTS "Administradores y Editores crean ordenes"
  ON public.ordenes;
DROP POLICY IF EXISTS "Administradores y Editores actualizan ordenes"
  ON public.ordenes;
DROP POLICY IF EXISTS "Administradores borran ordenes"
  ON public.ordenes;

CREATE POLICY "Roles autorizados leen ordenes"
  ON public.ordenes
  FOR SELECT
  TO authenticated
  USING (
    private.current_user_has_role(
      ARRAY['Administrador', 'Editor', 'Visualizador']
    )
    OR private.current_user_assigned_to_order(public.ordenes.id)
  );

CREATE POLICY "Administradores y Editores crean ordenes"
  ON public.ordenes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    private.current_user_has_role(ARRAY['Administrador', 'Editor'])
  );

CREATE POLICY "Administradores y Editores actualizan ordenes"
  ON public.ordenes
  FOR UPDATE
  TO authenticated
  USING (
    private.current_user_has_role(ARRAY['Administrador', 'Editor'])
  )
  WITH CHECK (
    private.current_user_has_role(ARRAY['Administrador', 'Editor'])
  );

CREATE POLICY "Administradores borran ordenes"
  ON public.ordenes
  FOR DELETE
  TO authenticated
  USING (
    private.current_user_has_role(ARRAY['Administrador'])
  );

-- ---------------------------------------------------------------------------
-- Order assignments
-- ---------------------------------------------------------------------------

ALTER TABLE public.orden_asignaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver asignaciones"
  ON public.orden_asignaciones;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear asignaciones"
  ON public.orden_asignaciones;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar asignaciones"
  ON public.orden_asignaciones;
DROP POLICY IF EXISTS "Usuarios autenticados pueden borrar asignaciones"
  ON public.orden_asignaciones;

DROP POLICY IF EXISTS "Usuarios pueden ver asignaciones"
  ON public.orden_asignaciones;
DROP POLICY IF EXISTS "Admins y Editores pueden crear asignaciones"
  ON public.orden_asignaciones;
DROP POLICY IF EXISTS "Admins y Editores pueden actualizar asignaciones"
  ON public.orden_asignaciones;
DROP POLICY IF EXISTS "Solo Admins pueden borrar asignaciones"
  ON public.orden_asignaciones;

DROP POLICY IF EXISTS "Roles autorizados leen asignaciones"
  ON public.orden_asignaciones;
DROP POLICY IF EXISTS "Administradores y Editores crean asignaciones"
  ON public.orden_asignaciones;
DROP POLICY IF EXISTS "Administradores y Editores actualizan asignaciones"
  ON public.orden_asignaciones;
DROP POLICY IF EXISTS "Administradores borran asignaciones"
  ON public.orden_asignaciones;

CREATE POLICY "Roles autorizados leen asignaciones"
  ON public.orden_asignaciones
  FOR SELECT
  TO authenticated
  USING (
    private.current_user_has_role(
      ARRAY['Administrador', 'Editor', 'Visualizador']
    )
    OR private.current_user_is_worker(
      public.orden_asignaciones.trabajador_id
    )
  );

CREATE POLICY "Administradores y Editores crean asignaciones"
  ON public.orden_asignaciones
  FOR INSERT
  TO authenticated
  WITH CHECK (
    private.current_user_has_role(ARRAY['Administrador', 'Editor'])
  );

CREATE POLICY "Administradores y Editores actualizan asignaciones"
  ON public.orden_asignaciones
  FOR UPDATE
  TO authenticated
  USING (
    private.current_user_has_role(ARRAY['Administrador', 'Editor'])
  )
  WITH CHECK (
    private.current_user_has_role(ARRAY['Administrador', 'Editor'])
  );

CREATE POLICY "Administradores borran asignaciones"
  ON public.orden_asignaciones
  FOR DELETE
  TO authenticated
  USING (
    private.current_user_has_role(ARRAY['Administrador'])
  );

-- ---------------------------------------------------------------------------
-- Work reports
-- ---------------------------------------------------------------------------

ALTER TABLE public.reportes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos pueden ver todos los reportes"
  ON public.reportes;
DROP POLICY IF EXISTS "Solo Admin, Editor y Trabajador pueden crear reportes"
  ON public.reportes;
DROP POLICY IF EXISTS "Todos pueden crear reportes"
  ON public.reportes;
DROP POLICY IF EXISTS "Solo propietario o Admin/Editor puede actualizar"
  ON public.reportes;
DROP POLICY IF EXISTS "Solo Admins pueden borrar reportes"
  ON public.reportes;

DROP POLICY IF EXISTS "Usuarios pueden ver sus propios reportes"
  ON public.reportes;
DROP POLICY IF EXISTS "Usuarios pueden insertar sus propios reportes"
  ON public.reportes;
DROP POLICY IF EXISTS "Trabajadores pueden ver sus reportes"
  ON public.reportes;
DROP POLICY IF EXISTS "Trabajadores pueden crear reportes"
  ON public.reportes;

DROP POLICY IF EXISTS "Roles autorizados leen reportes"
  ON public.reportes;
DROP POLICY IF EXISTS "Administradores y Editores crean reportes"
  ON public.reportes;
DROP POLICY IF EXISTS "Administradores y Editores actualizan reportes"
  ON public.reportes;
DROP POLICY IF EXISTS "Administradores borran reportes"
  ON public.reportes;

CREATE POLICY "Roles autorizados leen reportes"
  ON public.reportes
  FOR SELECT
  TO authenticated
  USING (
    private.current_user_has_role(
      ARRAY['Administrador', 'Editor', 'Visualizador']
    )
    OR (
      private.current_user_has_role(ARRAY['Trabajador'])
      AND (
        public.reportes.tecnico_id = auth.uid()
        OR private.current_user_assigned_to_order(public.reportes.orden_id)
      )
    )
  );

CREATE POLICY "Administradores y Editores crean reportes"
  ON public.reportes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    private.current_user_has_role(ARRAY['Administrador', 'Editor'])
  );

CREATE POLICY "Administradores y Editores actualizan reportes"
  ON public.reportes
  FOR UPDATE
  TO authenticated
  USING (
    private.current_user_has_role(ARRAY['Administrador', 'Editor'])
  )
  WITH CHECK (
    private.current_user_has_role(ARRAY['Administrador', 'Editor'])
  );

CREATE POLICY "Administradores borran reportes"
  ON public.reportes
  FOR DELETE
  TO authenticated
  USING (
    private.current_user_has_role(ARRAY['Administrador'])
  );

-- ---------------------------------------------------------------------------
-- Table privileges
-- ---------------------------------------------------------------------------

REVOKE ALL PRIVILEGES
  ON TABLE public.ordenes, public.orden_asignaciones, public.reportes
  FROM anon;

REVOKE TRUNCATE, TRIGGER, REFERENCES
  ON TABLE public.ordenes, public.orden_asignaciones, public.reportes
  FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.ordenes, public.orden_asignaciones, public.reportes
  TO authenticated;

COMMIT;
