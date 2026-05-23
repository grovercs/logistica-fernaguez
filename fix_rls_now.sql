ALTER TABLE public.orden_asignaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios pueden ver asignaciones" ON public.orden_asignaciones;
DROP POLICY IF EXISTS "Admins y Editores pueden crear asignaciones" ON public.orden_asignaciones;
DROP POLICY IF EXISTS "Admins y Editores pueden actualizar asignaciones" ON public.orden_asignaciones;
DROP POLICY IF EXISTS "Solo Admins pueden borrar asignaciones" ON public.orden_asignaciones;

CREATE POLICY "Usuarios autenticados pueden ver asignaciones" ON public.orden_asignaciones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados pueden crear asignaciones" ON public.orden_asignaciones FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios autenticados pueden actualizar asignaciones" ON public.orden_asignaciones FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Usuarios autenticados pueden borrar asignaciones" ON public.orden_asignaciones FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.configuracion_sistema (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clave TEXT NOT NULL UNIQUE,
  valor TEXT,
  descripcion TEXT,
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.configuracion_sistema (clave, valor, descripcion)
VALUES ('telegram_bot_token', NULL, 'Token del bot de Telegram para notificaciones push')
ON CONFLICT (clave) DO NOTHING;

ALTER TABLE public.configuracion_sistema ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver configuracion" ON public.configuracion_sistema;
DROP POLICY IF EXISTS "Usuarios autenticados pueden editar configuracion" ON public.configuracion_sistema;

CREATE POLICY "Usuarios autenticados pueden ver configuracion" ON public.configuracion_sistema FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados pueden editar configuracion" ON public.configuracion_sistema FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.trabajadores ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;
