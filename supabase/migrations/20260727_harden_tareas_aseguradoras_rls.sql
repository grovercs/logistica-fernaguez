BEGIN;

-- Endurece los catálogos operativos sin modificar los privilegios de
-- service_role. La autorización se basa en perfiles activos y roles
-- comprobados por private.current_user_has_role(text[]).

ALTER TABLE public.tareas_frecuentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aseguradoras ENABLE ROW LEVEL SECURITY;

-- Eliminar las políticas históricas permisivas de tareas_frecuentes.
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver tareas frecuentes"
  ON public.tareas_frecuentes;
DROP POLICY IF EXISTS "Usuarios pueden crear tareas frecuentes"
  ON public.tareas_frecuentes;
DROP POLICY IF EXISTS "Usuarios pueden actualizar tareas frecuentes"
  ON public.tareas_frecuentes;
DROP POLICY IF EXISTS "Usuarios pueden eliminar tareas frecuentes"
  ON public.tareas_frecuentes;

-- Permitir que la migración se vuelva a ejecutar sin colisiones.
DROP POLICY IF EXISTS "Administradores y Editores leen tareas frecuentes"
  ON public.tareas_frecuentes;
DROP POLICY IF EXISTS "Administradores crean tareas frecuentes"
  ON public.tareas_frecuentes;
DROP POLICY IF EXISTS "Administradores actualizan tareas frecuentes"
  ON public.tareas_frecuentes;
DROP POLICY IF EXISTS "Administradores eliminan tareas frecuentes"
  ON public.tareas_frecuentes;

CREATE POLICY "Administradores y Editores leen tareas frecuentes"
  ON public.tareas_frecuentes
  FOR SELECT
  TO authenticated
  USING (
    private.current_user_has_role(ARRAY['Administrador', 'Editor'])
  );

CREATE POLICY "Administradores crean tareas frecuentes"
  ON public.tareas_frecuentes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    private.current_user_has_role(ARRAY['Administrador'])
  );

CREATE POLICY "Administradores actualizan tareas frecuentes"
  ON public.tareas_frecuentes
  FOR UPDATE
  TO authenticated
  USING (
    private.current_user_has_role(ARRAY['Administrador'])
  )
  WITH CHECK (
    private.current_user_has_role(ARRAY['Administrador'])
  );

CREATE POLICY "Administradores eliminan tareas frecuentes"
  ON public.tareas_frecuentes
  FOR DELETE
  TO authenticated
  USING (
    private.current_user_has_role(ARRAY['Administrador'])
  );

-- Eliminar las políticas históricas permisivas de aseguradoras.
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver aseguradoras"
  ON public.aseguradoras;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear aseguradoras"
  ON public.aseguradoras;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar aseguradoras"
  ON public.aseguradoras;
DROP POLICY IF EXISTS "Usuarios autenticados pueden borrar aseguradoras"
  ON public.aseguradoras;

-- Permitir que la migración se vuelva a ejecutar sin colisiones.
DROP POLICY IF EXISTS "Administradores y Editores leen aseguradoras"
  ON public.aseguradoras;
DROP POLICY IF EXISTS "Administradores y Editores crean aseguradoras"
  ON public.aseguradoras;
DROP POLICY IF EXISTS "Administradores y Editores actualizan aseguradoras"
  ON public.aseguradoras;
DROP POLICY IF EXISTS "Administradores eliminan aseguradoras"
  ON public.aseguradoras;

CREATE POLICY "Administradores y Editores leen aseguradoras"
  ON public.aseguradoras
  FOR SELECT
  TO authenticated
  USING (
    private.current_user_has_role(ARRAY['Administrador', 'Editor'])
  );

CREATE POLICY "Administradores y Editores crean aseguradoras"
  ON public.aseguradoras
  FOR INSERT
  TO authenticated
  WITH CHECK (
    private.current_user_has_role(ARRAY['Administrador', 'Editor'])
  );

CREATE POLICY "Administradores y Editores actualizan aseguradoras"
  ON public.aseguradoras
  FOR UPDATE
  TO authenticated
  USING (
    private.current_user_has_role(ARRAY['Administrador', 'Editor'])
  )
  WITH CHECK (
    private.current_user_has_role(ARRAY['Administrador', 'Editor'])
  );

CREATE POLICY "Administradores eliminan aseguradoras"
  ON public.aseguradoras
  FOR DELETE
  TO authenticated
  USING (
    private.current_user_has_role(ARRAY['Administrador'])
  );

-- Mínimo privilegio de tabla. Las políticas RLS anteriores deciden qué filas
-- y operaciones puede efectuar cada rol de la aplicación.
REVOKE ALL PRIVILEGES
  ON TABLE public.tareas_frecuentes
  FROM anon;
REVOKE ALL PRIVILEGES
  ON TABLE public.tareas_frecuentes
  FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.tareas_frecuentes
  TO authenticated;

REVOKE ALL PRIVILEGES
  ON TABLE public.aseguradoras
  FROM anon;
REVOKE ALL PRIVILEGES
  ON TABLE public.aseguradoras
  FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.aseguradoras
  TO authenticated;

COMMIT;
