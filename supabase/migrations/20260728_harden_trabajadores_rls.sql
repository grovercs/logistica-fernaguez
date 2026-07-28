BEGIN;

-- El directorio global limitado se obtiene mediante
-- public.get_trabajadores_directory(). Esta tabla conserva acceso directo
-- global únicamente para Administrador y Editor activos.
ALTER TABLE public.trabajadores ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas históricas.
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver trabajadores"
  ON public.trabajadores;

DROP POLICY IF EXISTS "Usuarios autenticados pueden crear trabajadores"
  ON public.trabajadores;

DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar trabajadores"
  ON public.trabajadores;

DROP POLICY IF EXISTS "Usuarios autenticados pueden borrar trabajadores"
  ON public.trabajadores;

-- Políticas endurecidas; se eliminan preventivamente para mantener la
-- migración idempotente.
DROP POLICY IF EXISTS "Administradores y editores leen trabajadores"
  ON public.trabajadores;

DROP POLICY IF EXISTS "Trabajadores leen su propia fila"
  ON public.trabajadores;

DROP POLICY IF EXISTS "Administradores y editores crean trabajadores"
  ON public.trabajadores;

DROP POLICY IF EXISTS "Administradores y editores actualizan trabajadores"
  ON public.trabajadores;

CREATE POLICY "Administradores y editores leen trabajadores"
  ON public.trabajadores
  FOR SELECT
  TO authenticated
  USING (
    private.current_user_has_role(ARRAY['Administrador', 'Editor']::text[])
  );

CREATE POLICY "Trabajadores leen su propia fila"
  ON public.trabajadores
  FOR SELECT
  TO authenticated
  USING (
    public.trabajadores.auth_user_id = auth.uid()
    AND private.current_user_has_role(ARRAY['Trabajador']::text[])
  );

CREATE POLICY "Administradores y editores crean trabajadores"
  ON public.trabajadores
  FOR INSERT
  TO authenticated
  WITH CHECK (
    private.current_user_has_role(ARRAY['Administrador', 'Editor']::text[])
  );

CREATE POLICY "Administradores y editores actualizan trabajadores"
  ON public.trabajadores
  FOR UPDATE
  TO authenticated
  USING (
    private.current_user_has_role(ARRAY['Administrador', 'Editor']::text[])
  )
  WITH CHECK (
    private.current_user_has_role(ARRAY['Administrador', 'Editor']::text[])
  );

-- No existe política DELETE para authenticated. Las bajas se realizan
-- mediante UPDATE de estado, preservando asignaciones e históricos.
REVOKE ALL PRIVILEGES
  ON TABLE public.trabajadores
  FROM anon;

REVOKE ALL PRIVILEGES
  ON TABLE public.trabajadores
  FROM authenticated;

GRANT SELECT, INSERT, UPDATE
  ON TABLE public.trabajadores
  TO authenticated;

-- service_role no se modifica y nunca debe exponerse en el navegador.

COMMIT;
