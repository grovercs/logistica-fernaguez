-- Tabla para contadores secuenciales (ordenes, facturas, etc.)
CREATE TABLE IF NOT EXISTS public.contadores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prefijo TEXT NOT NULL,
  anio INTEGER NOT NULL,
  ultimo_numero INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(prefijo, anio)
);

-- Activar RLS
ALTER TABLE public.contadores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver contadores" ON public.contadores;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar contadores" ON public.contadores;

CREATE POLICY "Usuarios autenticados pueden ver contadores" ON public.contadores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados pueden actualizar contadores" ON public.contadores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed: inicializar contador para OB-2026 si no existe
INSERT INTO public.contadores (prefijo, anio, ultimo_numero)
VALUES ('OB', 2026, 0)
ON CONFLICT (prefijo, anio) DO NOTHING;

-- Función RPC para generar siguiente ID de orden de forma atómica
CREATE OR REPLACE FUNCTION public.generar_id_orden(prefijo TEXT, anio INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  nuevo_numero INTEGER;
BEGIN
  -- Insertar fila si no existe
  INSERT INTO public.contadores (prefijo, anio, ultimo_numero)
  VALUES (prefijo, anio, 0)
  ON CONFLICT (prefijo, anio) DO NOTHING;

  -- Incrementar y devolver atómicamente
  UPDATE public.contadores
  SET ultimo_numero = ultimo_numero + 1,
      updated_at = NOW()
  WHERE contadores.prefijo = generar_id_orden.prefijo
    AND contadores.anio = generar_id_orden.anio
  RETURNING ultimo_numero INTO nuevo_numero;

  RETURN prefijo || '-' || anio || '-' || LPAD(nuevo_numero::TEXT, 4, '0');
END;
$$;
