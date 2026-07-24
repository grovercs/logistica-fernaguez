-- Crear tabla de especialidades
CREATE TABLE IF NOT EXISTS public.especialidades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activar RLS
ALTER TABLE public.especialidades ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para usuarios autenticados
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver especialidades" ON public.especialidades;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear especialidades" ON public.especialidades;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar especialidades" ON public.especialidades;
DROP POLICY IF EXISTS "Usuarios autenticados pueden borrar especialidades" ON public.especialidades;

CREATE POLICY "Usuarios autenticados pueden ver especialidades" ON public.especialidades FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados pueden crear especialidades" ON public.especialidades FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios autenticados pueden actualizar especialidades" ON public.especialidades FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Usuarios autenticados pueden borrar especialidades" ON public.especialidades FOR DELETE TO authenticated USING (true);

-- Seed data: especialidades actuales
INSERT INTO public.especialidades (nombre) VALUES
  ('Fontanería'),
  ('Electricidad'),
  ('Albañilería'),
  ('Pintura'),
  ('Carpintería'),
  ('Climatización')
ON CONFLICT (nombre) DO NOTHING;
