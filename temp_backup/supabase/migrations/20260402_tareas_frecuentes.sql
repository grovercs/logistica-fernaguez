-- Crear tabla para tareas frecuentes
CREATE TABLE IF NOT EXISTS public.tareas_frecuentes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Habilitar RLS
ALTER TABLE public.tareas_frecuentes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para tareas_frecuentes
CREATE POLICY "Usuarios autenticados pueden ver tareas frecuentes"
    ON public.tareas_frecuentes FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Usuarios pueden crear tareas frecuentes"
    ON public.tareas_frecuentes FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Usuarios pueden actualizar tareas frecuentes"
    ON public.tareas_frecuentes FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Usuarios pueden eliminar tareas frecuentes"
    ON public.tareas_frecuentes FOR DELETE
    TO authenticated
    USING (true);

-- Índice para búsquedas
CREATE INDEX IF NOT EXISTS idx_tareas_frecuentes_nombre ON public.tareas_frecuentes(nombre);

-- Insertar algunas tareas frecuentes por defecto
INSERT INTO public.tareas_frecuentes (nombre, descripcion) VALUES
    ('Revisión de instalación eléctrica', 'Inspección completa del sistema eléctrico'),
    ('Mantenimiento de caldera', 'Revisión y mantenimiento de calderas de calefacción'),
    ('Instalación de aire acondicionado', 'Montaje y puesta en marcha de equipos de AC'),
    ('Reparación de fontanería', 'Solución de problemas de tuberías y grifos'),
    ('Pintura de interiores', 'Pintura de paredes y techos en interiores'),
    ('Limpieza de fachadas', 'Lavado y limpieza de fachadas exteriores'),
    ('Revisión de alarmas', 'Comprobación y mantenimiento de sistemas de alarma'),
    ('Montaje de muebles', 'Ensamblaje e instalación de muebles');