-- Endurecimiento del catálogo RBAC.
--
-- public.roles puede leerse por usuarios autenticados porque la aplicación
-- móvil necesita consultar roles.nombre.
-- public.permisos y public.permisos_roles solo pueden leerse desde el cliente
-- por Administradores activos.
-- Ninguna tabla RBAC puede modificarse desde el navegador. Las modificaciones
-- quedan reservadas para un backend de confianza o service_role.
-- La service role nunca debe utilizarse ni exponerse en el frontend.
--
-- Dependencia: private.current_user_has_role(text[]) debe existir antes de
-- aplicar esta migración.

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permisos_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver roles"
  ON public.roles;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear roles"
  ON public.roles;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar roles"
  ON public.roles;
DROP POLICY IF EXISTS "Usuarios autenticados pueden borrar roles"
  ON public.roles;

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver permisos"
  ON public.permisos;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear permisos"
  ON public.permisos;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar permisos"
  ON public.permisos;
DROP POLICY IF EXISTS "Usuarios autenticados pueden borrar permisos"
  ON public.permisos;

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver permisos_roles"
  ON public.permisos_roles;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear permisos_roles"
  ON public.permisos_roles;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar permisos_roles"
  ON public.permisos_roles;
DROP POLICY IF EXISTS "Usuarios autenticados pueden borrar permisos_roles"
  ON public.permisos_roles;

DROP POLICY IF EXISTS "Usuarios autenticados leen roles"
  ON public.roles;
CREATE POLICY "Usuarios autenticados leen roles"
  ON public.roles
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Administradores leen permisos"
  ON public.permisos;
CREATE POLICY "Administradores leen permisos"
  ON public.permisos
  FOR SELECT
  TO authenticated
  USING (
    private.current_user_has_role(ARRAY['Administrador'])
  );

DROP POLICY IF EXISTS "Administradores leen permisos_roles"
  ON public.permisos_roles;
CREATE POLICY "Administradores leen permisos_roles"
  ON public.permisos_roles
  FOR SELECT
  TO authenticated
  USING (
    private.current_user_has_role(ARRAY['Administrador'])
  );

-- No se crean políticas INSERT, UPDATE ni DELETE para authenticated.
REVOKE ALL PRIVILEGES
  ON TABLE public.roles, public.permisos, public.permisos_roles
  FROM anon;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES
  ON TABLE public.roles, public.permisos, public.permisos_roles
  FROM authenticated;

GRANT SELECT
  ON TABLE public.roles, public.permisos, public.permisos_roles
  TO authenticated;
