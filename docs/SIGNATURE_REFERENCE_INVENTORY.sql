-- Read-only inventory for manual execution in Supabase SQL Editor.
-- It never returns a complete URL or query string.
WITH signatures AS (
  SELECT id AS reporte_id, orden_id, firma_url,
    CASE WHEN firma_url IS NULL OR btrim(firma_url) = '' THEN NULL ELSE lower(split_part(regexp_replace(firma_url, '[?#].*$', ''), '/', 3)) END AS host,
    CASE WHEN firma_url ~ '^https://tqwxvryvhwijbsixmzkq\.supabase\.co/storage/v1/object/(public|sign)/fotos-reportes/firmas/' THEN 'fotos-reportes/firmas/' ELSE 'other_or_unrecognized' END AS storage_location
  FROM public.reportes
)
SELECT jsonb_build_object(
  'total_reportes_con_firma', count(*) FILTER (WHERE firma_url IS NOT NULL AND btrim(firma_url) <> ''),
  'referencias_fotos_reportes_firmas', count(*) FILTER (WHERE storage_location = 'fotos-reportes/firmas/'),
  'referencias_otro_origen', count(*) FILTER (WHERE firma_url IS NOT NULL AND btrim(firma_url) <> '' AND storage_location = 'other_or_unrecognized'),
  'ejemplos_redactados', COALESCE((SELECT jsonb_agg(jsonb_build_object('reporte_id', reporte_id, 'orden_id', orden_id, 'host', host, 'bucket_prefijo_detectado', storage_location)) FROM (SELECT reporte_id, orden_id, host, storage_location FROM signatures WHERE firma_url IS NOT NULL AND btrim(firma_url) <> '' ORDER BY reporte_id LIMIT 10) examples), '[]'::jsonb)
) AS inventario_firmas
FROM signatures;