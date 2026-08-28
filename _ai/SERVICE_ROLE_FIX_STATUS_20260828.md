# Estado: corrección de exposición de service_role — 2026-08-28

## Resumen ejecutivo

Se completó la eliminación de toda dependencia de `service_role` / `SUPABASE_SERVICE_ROLE_KEY` / `VITE_SUPABASE_SERVICE_ROLE_KEY` del bundle del frontend. El frontend puede volver a compilar sin filtrar la clave de servicio, y las operaciones de Auth Admin inseguras quedaron temporalmente deshabilitadas en el cliente con un mensaje claro. El backend seguro (Netlify Edge Functions) sigue siendo la única vía autorizada para operaciones privilegiadas.

**Veredicto: LISTO PARA DEPLOY** ✅  
(Siguiente paso: deploy del frontend mobile, smoke test, reconciliación histórica de 35 reportes / 18 asignaciones, verificación OB-2026-0082 / Jonatan.)

## Cambios realizados

### 1. `logistica-frontend/.env.local`
- **Eliminada** la línea `VITE_SUPABASE_SERVICE_ROLE_KEY=...`.
- El archivo está `.gitignore`, por lo que nunca llegó a commit, pero ahora tampoco será leído por Vite en build local ni podrá ser bundleado por accidente.

### 2. `logistica-frontend/src/lib/supabase-admin.ts`
- Mantiene el reexport del cliente anónimo para compatibilidad, pero ahora incluye una advertencia en runtime si se carga en el navegador.
- Comentario actualizado que indica explícitamente que Auth Admin debe ejecutarse en Netlify Edge Functions con `SUPABASE_SERVICE_ROLE_KEY`.

### 3. Componentes legacy con llamadas `supabaseAdmin.auth.admin.*` deshabilitadas
| Archivo | Operación afectada | Comportamiento ahora |
|---|---|---|
| `RbacDashboard.tsx` | `listUsers` para obtener emails | El email se muestra como `"no disponible"`. Se mantiene la carga de perfiles/roles. |
| `AltaUsuarioModal.tsx` | `createUser` | Muestra alerta no bloqueante: *"Función temporalmente deshabilitada; usa la gestión de usuarios segura."* |
| `CrearAccesoModal.tsx` | `listUsers`, `updateUserById`, `createUser` | Muestra alerta no bloqueante: *"Función temporalmente deshabilitada; usa la gestión de usuarios segura."* |
| `EditarUsuarioModal.tsx` | `updateUserById` para reset de password | Muestra alerta no bloqueante y cierra el panel de reset. |

> Nota: la gestión de usuarios segura vive en `Usuarios.tsx` y consume Netlify Functions (`admin-list-users`, `admin-create-user`, `admin-update-user-profile`, `admin-reset-user-password`, `admin-delete-user`, etc.).

## Verificación de bundles

### Frontend (`logistica-frontend/dist/`)
- Build: ✅ éxito
- Búsqueda en `dist/` por `service_role`, `VITE_SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, y fragmento JWT de la clave anterior: **sin coincidencias**.

### Mobile (`logistica-mobile/dist/`)
- Build: ✅ éxito
- Búsqueda en `dist/` por los mismos patrones: **sin coincidencias**.

### Código fuente
- `grep` en `logistica-frontend/src` y `logistica-mobile/src` no encuentra `VITE_SUPABASE_SERVICE_ROLE_KEY` ni llamadas a `auth.admin`.
- Las únicas menciones a `SUPABASE_SERVICE_ROLE_KEY` en `src` son comentarios informativos que no viajan al bundle.

## Tests

- `logistica-mobile/contracts/MobileOrdenes.contract.test.ts`: ✅ pasa.
- Builds TypeScript + Vite de frontend y mobile: ✅ pasan.
- Contract tests de backend Netlify: algunos fallan por **discrepancias pre-existentes** entre las regex de los tests y el código actual (por ejemplo, texto "EVIDENCIAS COPIADAS" no encontrado en `BackupCenter.tsx`, regex de `Confirmación` con acento mal escapada, módulos importados sin extensión `.ts`). Ninguno de estos fallos está relacionado con la corrección de `service_role`.
- Lint: los errores restantes en los archivos tocados son pre-existentes (`any` sin tipar, `setState` sincrónico dentro de `useEffect` en `EditarUsuarioModal.tsx`). No se introdujeron nuevos errores de lint.

## Variables de entorno de Netlify (recomendación final)

### Variables públicas / seguras en el frontend
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_CLOUDINARY_CLOUD_NAME`
- `VITE_CLOUDINARY_API_KEY`
- `VITE_CLOUDINARY_UPLOAD_PRESET`

### Variables secretas (solo servidor / Netlify Functions)
- `SUPABASE_SERVICE_ROLE_KEY` ✅ (necesaria en Edge Functions; nunca como `VITE_*`)
- `SUPABASE_URL`
- `ADMIN_PRODUCTION_ORIGIN`
- `BACKUP_WORKER_SECRET`
- Cualquier otra clave de API de terceros usada solo en servidor.

### Variables a eliminar / verificar que no existan
- `VITE_SUPABASE_SERVICE_ROLE_KEY` ❌ (eliminada de `.env.local`; asegurar que no esté en Netlify UI)
- Cualquier otra variable con prefijo `VITE_` que contenga secretos.

## Estado del despliegue / reconciliación

- RPC `assigned_user_save_report`: aplicado en producción y verificado (SECURITY DEFINER, permisos correctos).
- Mobile frontend: limpio de `service_role` y listo para deploy.
- Frontend admin: caminos Admin legacy deshabilitados; gestión segura via Netlify Functions intacta.

### Bloqueos restantes
- Se requieren credenciales de Netlify (`NETLIFY_AUTH_TOKEN`) para ejecutar el deploy. En la sesión anterior el deploy falló por variable no definida.

## Recomendación

1. Verificar en el panel de Netlify que **no** exista `VITE_SUPABASE_SERVICE_ROLE_KEY` en las variables del sitio.
2. Proporcionar `NETLIFY_AUTH_TOKEN` para continuar con el deploy del mobile.
3. Ejecutar smoke test post-deploy.
4. Ejecutar reconciliación de 35 reportes / 18 asignaciones con rollback determinista preparado.
5. Verificar OB-2026-0082 / Jonatan y el conteo final de huérfanos.
6. Commit + push de todos los cambios correspondientes.

---
Generado: 2026-08-28
