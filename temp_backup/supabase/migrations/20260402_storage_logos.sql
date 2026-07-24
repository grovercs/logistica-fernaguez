-- Crear bucket para logos de clientes
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para permitir upload de logos
CREATE POLICY "Usuarios autenticados pueden subir logos"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'logos');

CREATE POLICY "Usuarios pueden ver logos"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'logos');

CREATE POLICY "Usuarios pueden actualizar logos"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'logos');

CREATE POLICY "Usuarios pueden eliminar logos"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'logos');

-- Añadir columna logo_url a la tabla aseguradoras si no existe
ALTER TABLE public.aseguradoras ADD COLUMN IF NOT EXISTS logo_url TEXT;