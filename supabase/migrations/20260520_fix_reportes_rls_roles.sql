-- =====================================================
-- MIGRACIÓN: Corregir RLS en tabla reportes por roles
-- Fecha: 2026-05-20
-- Problema: Cualquier usuario autenticado podía crear reportes.
--           El usuario "Pedro Perez" con rol Visualizador creó
--           el reporte OB-2026-9022 cuando no debería poder.
-- Solución: Restringir INSERT/UPDATE/DELETE según rol.
-- =====================================================

-- 1. Eliminar políticas viejas que estaban demasiado permisivas
DROP POLICY IF EXISTS "Todos pueden crear reportes" ON reportes;
DROP POLICY IF EXISTS "Solo propietario o Admin/Editor puede actualizar" ON reportes;
DROP POLICY IF EXISTS "Solo Admins pueden borrar reportes" ON reportes;

-- 2. INSERT: Solo Administrador, Editor o Trabajador pueden crear reportes
--    Los Visualizadores quedan bloqueados.
CREATE POLICY "Solo Admin, Editor y Trabajador pueden crear reportes" ON reportes
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles p
      JOIN roles r ON r.id = p.rol_id
      WHERE p.id = auth.uid()
      AND r.nombre IN ('Administrador', 'Editor', 'Trabajador')
    )
  );

-- 3. UPDATE: El propietario (técnico) puede editar sus propios reportes.
--    Administrador y Editor pueden editar cualquiera.
CREATE POLICY "Solo propietario o Admin/Editor puede actualizar" ON reportes
  FOR UPDATE TO authenticated USING (
    tecnico_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM perfiles p
      JOIN roles r ON r.id = p.rol_id
      WHERE p.id = auth.uid()
      AND r.nombre IN ('Administrador', 'Editor')
    )
  );

-- 4. DELETE: Solo Administrador puede borrar reportes
CREATE POLICY "Solo Admins pueden borrar reportes" ON reportes
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM perfiles p
      JOIN roles r ON r.id = p.rol_id
      WHERE p.id = auth.uid()
      AND r.nombre = 'Administrador'
    )
  );

-- 5. Comentario actualizado
COMMENT ON TABLE reportes IS 'Reportes/intervenciones de trabajo. Todos pueden ver, pero solo Admin/Editor/Trabajador pueden crear. Solo propietario o Admin/Editor pueden editar. Solo Admin puede borrar.';
