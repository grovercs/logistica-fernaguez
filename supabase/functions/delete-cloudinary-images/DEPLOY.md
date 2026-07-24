# Despliegue Edge Function: delete-cloudinary-images

## Archivos modificados/creados
- `supabase/functions/delete-cloudinary-images/index.ts` — Edge Function que borra imágenes de Cloudinary
- `logistica-frontend/src/lib/cloudinary.ts` — Helper `deleteCloudinaryImages()` para llamar desde el frontend
- `logistica-frontend/src/pages/OrdenDetalle.tsx` — Al archivar orden, borra fotos de Cloudinary primero
- `logistica-frontend/src/components/modals/EditarReporteModal.tsx` — Al quitar una foto, la borra de Cloudinary
- `logistica-mobile/src/pages/mobile/MobileDetalleOrden.tsx` — Al borrar reporte, borra fotos de Cloudinary

## Comandos para desplegar

1. **Link proyecto** (si no está linkeado):
```bash
npx supabase login
npx supabase link --project-ref tqwxvryvhwijbsixmzkq
```

2. **Desplegar la función**:
```bash
npx supabase functions deploy delete-cloudinary-images
```

3. **Verificar**:
Después del deploy, la función estará disponible en:
`https://tqwxvryvhwijbsixmzkq.supabase.co/functions/v1/delete-cloudinary-images`

## Nota sobre CORS
Si el frontend da error de CORS al llamar a la Edge Function, añadir al inicio de `index.ts`:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Manejar OPTIONS preflight
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders });
}
```

## Prueba manual (curl)
```bash
curl -X POST https://tqwxvryvhwijbsixmzkq.supabase.co/functions/v1/delete-cloudinary-images \
  -H "Authorization: Bearer TU_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"public_ids": ["logistica/visitas/OB-2026-0001_2026-05-23_foto_1"]}'
```
