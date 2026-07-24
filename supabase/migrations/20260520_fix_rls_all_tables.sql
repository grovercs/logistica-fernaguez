-- =====================================================
-- MIGRACIÓN CRÍTICA: Habilitar RLS en todas las tablas públicas
-- Fecha: 2026-05-20
-- Propósito: Solucionar vulnerabilidad de seguridad reportada por Supabase.
--            Tablas públicas sin RLS permiten lectura/escritura/borrado
--            por cualquier persona con la URL y la Anon Key.
-- =====================================================

-- =====================================================
-- 1. TABLA: ordenes
-- =====================================================
ALTER TABLE public.ordenes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver ordenes" ON public.ordenes;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear ordenes" ON public.ordenes;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar ordenes" ON public.ordenes;
DROP POLICY IF EXISTS "Usuarios autenticados pueden borrar ordenes" ON public.ordenes;

CREATE POLICY "Usuarios autenticados pueden ver ordenes" ON public.ordenes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden crear ordenes" ON public.ordenes
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar ordenes" ON public.ordenes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden borrar ordenes" ON public.ordenes
  FOR DELETE TO authenticated USING (true);


-- =====================================================
-- 2. TABLA: trabajadores
-- =====================================================
ALTER TABLE public.trabajadores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver trabajadores" ON public.trabajadores;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear trabajadores" ON public.trabajadores;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar trabajadores" ON public.trabajadores;
DROP POLICY IF EXISTS "Usuarios autenticados pueden borrar trabajadores" ON public.trabajadores;

CREATE POLICY "Usuarios autenticados pueden ver trabajadores" ON public.trabajadores
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden crear trabajadores" ON public.trabajadores
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar trabajadores" ON public.trabajadores
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden borrar trabajadores" ON public.trabajadores
  FOR DELETE TO authenticated USING (true);


-- =====================================================
-- 3. TABLA: aseguradoras
-- =====================================================
ALTER TABLE public.aseguradoras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver aseguradoras" ON public.aseguradoras;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear aseguradoras" ON public.aseguradoras;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar aseguradoras" ON public.aseguradoras;
DROP POLICY IF EXISTS "Usuarios autenticados pueden borrar aseguradoras" ON public.aseguradoras;

CREATE POLICY "Usuarios autenticados pueden ver aseguradoras" ON public.aseguradoras
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden crear aseguradoras" ON public.aseguradoras
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar aseguradoras" ON public.aseguradoras
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden borrar aseguradoras" ON public.aseguradoras
  FOR DELETE TO authenticated USING (true);


-- =====================================================
-- 4. TABLA: perfiles
-- =====================================================
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver perfiles" ON public.perfiles;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear perfiles" ON public.perfiles;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar perfiles" ON public.perfiles;
DROP POLICY IF EXISTS "Usuarios autenticados pueden borrar perfiles" ON public.perfiles;

CREATE POLICY "Usuarios autenticados pueden ver perfiles" ON public.perfiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden crear perfiles" ON public.perfiles
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar perfiles" ON public.perfiles
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden borrar perfiles" ON public.perfiles
  FOR DELETE TO authenticated USING (true);


-- =====================================================
-- 5. TABLA: roles
-- =====================================================
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver roles" ON public.roles;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear roles" ON public.roles;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar roles" ON public.roles;
DROP POLICY IF EXISTS "Usuarios autenticados pueden borrar roles" ON public.roles;

CREATE POLICY "Usuarios autenticados pueden ver roles" ON public.roles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden crear roles" ON public.roles
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar roles" ON public.roles
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden borrar roles" ON public.roles
  FOR DELETE TO authenticated USING (true);


-- =====================================================
-- 6. TABLA: permisos
-- =====================================================
ALTER TABLE public.permisos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver permisos" ON public.permisos;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear permisos" ON public.permisos;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar permisos" ON public.permisos;
DROP POLICY IF EXISTS "Usuarios autenticados pueden borrar permisos" ON public.permisos;

CREATE POLICY "Usuarios autenticados pueden ver permisos" ON public.permisos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden crear permisos" ON public.permisos
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar permisos" ON public.permisos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden borrar permisos" ON public.permisos
  FOR DELETE TO authenticated USING (true);


-- =====================================================
-- 7. TABLA: permisos_roles
-- =====================================================
ALTER TABLE public.permisos_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver permisos_roles" ON public.permisos_roles;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear permisos_roles" ON public.permisos_roles;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar permisos_roles" ON public.permisos_roles;
DROP POLICY IF EXISTS "Usuarios autenticados pueden borrar permisos_roles" ON public.permisos_roles;

CREATE POLICY "Usuarios autenticados pueden ver permisos_roles" ON public.permisos_roles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden crear permisos_roles" ON public.permisos_roles
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar permisos_roles" ON public.permisos_roles
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden borrar permisos_roles" ON public.permisos_roles
  FOR DELETE TO authenticated USING (true);


-- =====================================================
-- NOTAS DE SEGURIDAD FUTURAS (después de cerrar la brecha crítica):
-- =====================================================
-- Las políticas actuales permiten a CUALQUIER usuario autenticado leer/escribir.
-- Esto cierra la vulnerabilidad crítica (acceso anónimo), pero NO es el modelo
-- de permisos final óptimo. Próximos pasos:
--
-- 1. Restringir INSERT/UPDATE/DELETE en 'ordenes', 'trabajadores', 'aseguradoras'
--    solo a usuarios con rol Administrador o Editor.
--
-- 2. Restringir INSERT/UPDATE/DELETE en 'roles', 'permisos', 'permisos_roles'
--    solo a usuarios con rol Administrador.
--
-- 3. Restringir UPDATE en 'perfiles' solo al propio usuario o a Admin/Editor.
--
-- 4. Implementar una función helper is_admin() o is_editor() para simplificar
--    las políticas y evitar repetir la subconsulta de roles en cada tabla.
-- =====================================================
