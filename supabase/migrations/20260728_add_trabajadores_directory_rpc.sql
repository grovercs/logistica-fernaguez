BEGIN;

CREATE OR REPLACE FUNCTION public.get_trabajadores_directory()
RETURNS TABLE (
  trabajador_id uuid,
  auth_user_id uuid,
  nombre text,
  apellidos text,
  especialidad text,
  estado text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    t.id AS trabajador_id,
    t.auth_user_id,
    t.nombre::text,
    t.apellidos::text,
    t.especialidad::text,
    t.estado::text
  FROM public.trabajadores AS t
  WHERE auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.perfiles AS p
      JOIN public.roles AS r
        ON r.id = p.rol_id
      WHERE p.id = auth.uid()
        AND p.activo IS TRUE
        AND r.nombre = ANY (
          ARRAY['Administrador', 'Editor', 'Visualizador', 'Trabajador']::text[]
        )
    )
  ORDER BY t.nombre, t.apellidos;
$$;

REVOKE EXECUTE
  ON FUNCTION public.get_trabajadores_directory()
  FROM PUBLIC, anon;

GRANT EXECUTE
  ON FUNCTION public.get_trabajadores_directory()
  TO authenticated, service_role;

COMMIT;
