-- =====================================================
-- MIGRACIÓN: Arreglar RLS en tabla reportes
-- Fecha: 2026-04-01
-- Propósito: Permitir que todos los trabajadores vean TODAS las intervenciones
-- pero solo puedan editar las suyas propias
-- =====================================================

-- 1. Primero verificamos si RLS está habilitado y deshabilitamos temporalmente
ALTER TABLE reportes DISABLE ROW LEVEL SECURITY;

-- 2. Eliminamos políticas existentes que puedan estar filtrando por usuario
DROP POLICY IF EXISTS "Usuarios pueden ver sus propios reportes" ON reportes;
DROP POLICY IF EXISTS "Usuarios pueden insertar sus propios reportes" ON reportes;
DROP POLICY IF EXISTS "Trabajadores pueden ver sus reportes" ON reportes;
DROP POLICY IF EXISTS "Trabajadores pueden crear reportes" ON reportes;

-- 3. Creamos nuevas políticas más permisivas

-- Todos los usuarios autenticados pueden VER TODOS los reportes
-- Esto permite que un trabajador vea lo que hicieron otros
CREATE POLICY "Todos pueden ver todos los reportes" ON reportes
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Todos los usuarios autenticados pueden CREAR reportes
-- El tecnico_id se establece automáticamente al usuario actual
CREATE POLICY "Todos pueden crear reportes" ON reportes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Solo el creador del reporte, Admins y Editores pueden ACTUALIZAR
CREATE POLICY "Solo propietario o Admin/Editor puede actualizar" ON reportes
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND (
      tecnico_id = auth.uid()  -- El propietario puede editar
      OR EXISTS (
        SELECT 1 FROM perfiles
        WHERE id = auth.uid()
        AND roles.nombre IN ('Administrador', 'Editor')
      )
    )
  );

-- Solo Admins pueden BORRAR reportes
CREATE POLICY "Solo Admins pueden borrar reportes" ON reportes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid()
      AND roles.nombre = 'Administrador'
    )
  );

-- 4. Volvemos a habilitar RLS
ALTER TABLE reportes ENABLE ROW LEVEL SECURITY;

-- 5. Comentario documentación
COMMENT ON TABLE reportes IS 'Reportes/intervenciones de trabajo. Todos los usuarios pueden ver todos los reportes, pero solo pueden editar los propios o si son Admin/Editor.';