-- Endurecimiento de acceso a perfiles.
--
-- Un usuario autenticado normal solo puede leer su propio perfil.
-- Un Administrador activo puede leer todos los perfiles.
-- Desde el cliente, incluso un Administrador solo puede actualizar tarifa_hora.
-- rol_id, activo, la creación y la eliminación de perfiles quedan reservados
-- para un backend de confianza o service_role.
-- La service role nunca debe utilizarse ni exponerse en el navegador.

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.current_user_has_role(allowed_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfiles AS perfiles
    INNER JOIN public.roles AS roles
      ON roles.id = perfiles.rol_id
    WHERE perfiles.id = auth.uid()
      AND perfiles.activo IS TRUE
      AND roles.nombre = ANY (allowed_roles)
  );
$$;

REVOKE EXECUTE
  ON FUNCTION private.current_user_has_role(text[])
  FROM PUBLIC, anon;

GRANT EXECUTE
  ON FUNCTION private.current_user_has_role(text[])
  TO authenticated, service_role;

ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver perfiles"
  ON public.perfiles;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear perfiles"
  ON public.perfiles;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar perfiles"
  ON public.perfiles;
DROP POLICY IF EXISTS "Usuarios autenticados pueden borrar perfiles"
  ON public.perfiles;

CREATE POLICY "Usuarios leen su perfil o Administradores leen perfiles"
  ON public.perfiles
  FOR SELECT
  TO authenticated
  USING (
    public.perfiles.id = auth.uid()
    OR private.current_user_has_role(ARRAY['Administrador'])
  );

CREATE POLICY "Administradores actualizan perfiles"
  ON public.perfiles
  FOR UPDATE
  TO authenticated
  USING (
    private.current_user_has_role(ARRAY['Administrador'])
  )
  WITH CHECK (
    private.current_user_has_role(ARRAY['Administrador'])
  );

-- El cliente autenticado conserva lectura y solo puede intentar actualizar
-- tarifa_hora. RLS determina qué filas son visibles o actualizables.
-- rol_id, activo, INSERT y DELETE quedan reservados para backend/service_role.
REVOKE ALL PRIVILEGES
  ON TABLE public.perfiles
  FROM anon;

REVOKE INSERT, DELETE, TRUNCATE, TRIGGER, REFERENCES, UPDATE
  ON TABLE public.perfiles
  FROM authenticated;

GRANT SELECT
  ON TABLE public.perfiles
  TO authenticated;

GRANT UPDATE (tarifa_hora)
  ON TABLE public.perfiles
  TO authenticated;
