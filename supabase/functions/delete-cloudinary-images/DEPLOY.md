# Despliegue Edge Function: delete-cloudinary-images

## Archivos modificados/creados
- `supabase/functions/delete-cloudinary-images/index.ts` — Edge Function que borra imágenes de Cloudinary
- `logistica-frontend/src/lib/cloudinary.ts` — Helper `deleteCloudinaryImages()` para llamar desde el frontend
- `logistica-frontend/src/pages/OrdenDetalle.tsx` — Al archivar orden, borra fotos de Cloudinary primero
- `logistica-frontend/src/components/modals/EditarReporteModal.tsx` — Al quitar una foto, la borra de Cloudinary
- `logistica-mobile/src/pages/mobile/MobileDetalleOrden.tsx` — Al borrar reporte, borra fotos de Cloudinary

## Configuracion segura antes del despliegue

No incluyas secretos en este repositorio ni los pases al navegador. Configura
estos secretos en Supabase Edge Functions:

```bash
npx supabase secrets set \
  CLOUDINARY_CLOUD_NAME='...' \
  CLOUDINARY_API_KEY='...' \
  CLOUDINARY_API_SECRET='...' \
  SUPABASE_URL='...' \
  SUPABASE_ANON_KEY='...' \
  SUPABASE_SERVICE_ROLE_KEY='...'
```

La Function valida el JWT con la clave anon y comprueba que el solicitante es
un Administrador activo con el cliente server-side. La service role no se
entrega al navegador.

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

## CORS

La Function permite explicitamente `https://admin.appvielha.com`, desarrollo
en localhost/127.0.0.1 y `https://app.appvielha.com` mientras el flujo movil
existente de borrado de evidencias siga invocandola. No usa comodines.

## Prueba manual (curl)
```bash
curl -X POST https://tqwxvryvhwijbsixmzkq.supabase.co/functions/v1/delete-cloudinary-images \
  -H "Authorization: Bearer TU_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"public_ids": ["logistica/visitas/OB-2026-0001_2026-05-23_foto_1"]}'
```
