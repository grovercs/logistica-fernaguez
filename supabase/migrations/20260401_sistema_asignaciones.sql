-- =====================================================
-- MIGRACIÓN: Sistema de asignaciones múltiples
-- Fecha: 2026-04-01
-- =====================================================

-- 1. Añadir campos a la tabla ordenes
ALTER TABLE ordenes ADD COLUMN IF NOT EXISTS fecha_programada DATE;
ALTER TABLE ordenes ADD COLUMN IF NOT EXISTS hora_programada TIME;
ALTER TABLE ordenes ADD COLUMN IF NOT EXISTS auto_asignacion BOOLEAN DEFAULT false;

-- 2. Crear tabla de asignaciones múltiples
CREATE TABLE IF NOT EXISTS orden_asignaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id UUID NOT NULL REFERENCES ordenes(id) ON DELETE CASCADE,
  trabajador_id UUID NOT NULL REFERENCES trabajadores(id) ON DELETE CASCADE,
  fecha_asignacion DATE DEFAULT CURRENT_DATE,
  hora_programada TIME,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_progreso', 'completado', 'cancelado')),
  notas TEXT,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_asignaciones_orden ON orden_asignaciones(orden_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_trabajador ON orden_asignaciones(trabajador_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_estado ON orden_asignaciones(estado);

-- 4. Trigger para actualizar fecha de modificación
CREATE OR REPLACE FUNCTION update_asignacion_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_asignacion
BEFORE UPDATE ON orden_asignaciones
FOR EACH ROW
EXECUTE FUNCTION update_asignacion_timestamp();

-- 5. Habilitar RLS (Row Level Security)
ALTER TABLE orden_asignaciones ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de seguridad
-- Todos los usuarios autenticados pueden ver asignaciones
CREATE POLICY "Usuarios pueden ver asignaciones" ON orden_asignaciones
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Solo admins y editores pueden crear asignaciones
CREATE POLICY "Admins y Editores pueden crear asignaciones" ON orden_asignaciones
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid()
      AND roles.nombre IN ('Administrador', 'Editor')
    )
  );

-- Solo admins y editores pueden actualizar asignaciones
CREATE POLICY "Admins y Editores pueden actualizar asignaciones" ON orden_asignaciones
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid()
      AND roles.nombre IN ('Administrador', 'Editor')
    )
  );

-- Solo admins pueden borrar asignaciones
CREATE POLICY "Solo Admins pueden borrar asignaciones" ON orden_asignaciones
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid()
      AND roles.nombre = 'Administrador'
    )
  );

-- 7. Comentario para documentación
COMMENT ON TABLE orden_asignaciones IS 'Asignaciones de trabajadores a órdenes de trabajo. Permite múltiples trabajadores por orden.';