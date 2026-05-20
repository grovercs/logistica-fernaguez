-- =====================================================
-- MIGRACIÓN: Configuración del sistema y Telegram
-- Fecha: 2026-05-20
-- =====================================================

-- 1. Tabla de configuración del sistema
CREATE TABLE IF NOT EXISTS public.configuracion_sistema (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clave TEXT NOT NULL UNIQUE,
  valor TEXT,
  descripcion TEXT,
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar fila para el token del bot de Telegram (vacía inicialmente)
INSERT INTO public.configuracion_sistema (clave, valor, descripcion)
VALUES ('telegram_bot_token', NULL, 'Token del bot de Telegram para notificaciones push')
ON CONFLICT (clave) DO NOTHING;

-- 2. Añadir telegram_chat_id a trabajadores
ALTER TABLE public.trabajadores ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

-- 3. RLS para configuracion_sistema
ALTER TABLE public.configuracion_sistema ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver configuracion" ON public.configuracion_sistema;
DROP POLICY IF EXISTS "Usuarios autenticados pueden editar configuracion" ON public.configuracion_sistema;

CREATE POLICY "Usuarios autenticados pueden ver configuracion" ON public.configuracion_sistema
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden editar configuracion" ON public.configuracion_sistema
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden crear configuracion" ON public.configuracion_sistema
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden borrar configuracion" ON public.configuracion_sistema
  FOR DELETE TO authenticated USING (true);
