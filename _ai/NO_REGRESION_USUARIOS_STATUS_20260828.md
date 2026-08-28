# Verificación: corrección de service_role no rompe gestión de usuarios

Fecha: 2026-08-28  
Commit base: `c7342a6`

## Objetivo

Comprobar que el commit de seguridad que eliminó `VITE_SUPABASE_SERVICE_ROLE_KEY` y deshabilitó llamadas `supabaseAdmin.auth.admin.*` no provocó una regresión funcional en la administración de usuarios antes de desplegar.

## Metodología

1. Buscar imports/usos reales de los componentes deshabilitados en toda la aplicación.
2. Mapear cada acción deshabilitada a su equivalente seguro en Netlify Edge/Functions.
3. Verificar builds y que los bundles sigan sin contener `service_role`.
4. Ejecutar contract tests relevantes de usuarios.

## Hallazgo principal

Los cuatro componentes afectados **no se usan en ninguna ruta ni flujo activo**. La gestión de usuarios real se ejecuta desde `Usuarios.tsx` y consume Netlify Functions seguras.

| Función visible | Componente afectado | ¿Se usa? | Backend seguro actual | Estado final |
|---|---|---|---|---|
| Listar usuarios + mostrar email | `RbacDashboard.tsx` | **No** | `Usuarios.tsx` → `admin-list-users` | Obsoleto; sin regresión. |
| Crear usuario | `AltaUsuarioModal.tsx` | **No** | `Usuarios.tsx` → `admin-create-user` | Obsoleto; sin regresión. |
| Crear acceso / vincular trabajador | `CrearAccesoModal.tsx` | **No** | `Usuarios.tsx` → `admin-create-user` + `admin-update-user-profile` (vincula trabajador) | Obsoleto; sin regresión. |
| Editar perfil + resetear contraseña | `EditarUsuarioModal.tsx` | **No** | `Usuarios.tsx` → `admin-update-user-profile` + `admin-reset-user-password` | Obsoleto; sin regresión. |
| Eliminar usuario | (no tenía modal legacy) | Sí vía `Usuarios.tsx` | `admin-delete-user` / `admin-delete-test-user` | Operativo. |

### Evidencia de que no se usan

- `src/App.tsx` no importa ninguno de los cuatro componentes.
- La ruta `/rbac` apunta a `AdminMaintenance.tsx`, no a `RbacDashboard.tsx`.
- Búsqueda global de `import .*RbacDashboard|AltaUsuarioModal|CrearAccesoModal|EditarUsuarioModal` en `src/`: **0 coincidencias**.
- Búsqueda de nombres en todo el frontend (excluyendo sus propios archivos): **0 referencias**.

### Backend seguro mapeado

| Acción | Netlify Function / Edge Function | Notas |
|---|---|---|
| Listar usuarios con email, rol, estado, último acceso, trabajador vinculado | `admin-list-users.ts` | Usa `supabaseAdmin` solo en servidor. |
| Crear usuario con perfil | `admin-create-user.ts` | Envía sesión JWT del admin. |
| Crear perfil para cuenta Auth existente | `admin-create-user-profile.ts` | Para cuentas de prueba sin perfil. |
| Actualizar perfil (nombre, rol, activo, trabajador) | `admin-update-user-profile.ts` | Valida roles, confirmación de asignaciones activas. |
| Vincular trabajador a usuario | `admin-link-user-worker.ts` (RPC `admin_link_user_worker`) | Llamado indirectamente desde `admin-update-user-profile.ts`. |
| Resetear contraseña | `admin-reset-user-password.ts` | Mínimo 10 caracteres, requiere admin activo. |
| Eliminar usuario con actividad asociada | `admin-delete-user.ts` | Bloquea si hay actividad. |
| Eliminar cuenta de prueba sin actividad | `admin-delete-test-user.ts` | Auditoría y confirmación por email. |

## Verificación técnica

| Verificación | Resultado |
|---|---|
| Build `logistica-frontend` | ✅ Éxito |
| Build `logistica-mobile` | ✅ Éxito |
| Scan `dist/` frontend por `service_role` / `VITE_SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SERVICE_ROLE_KEY` / JWT de clave anterior | ✅ Sin coincidencias |
| Scan `dist/` mobile por los mismos patrones | ✅ Sin coincidencias |
| `MobileOrdenes.contract.test.ts` | ✅ Pasa |
| `admin-create-user.contract.test.ts` | ✅ Pasa |
| `admin-update-user-profile.contract.test.ts` | ✅ Pasa |
| `admin-reset-user-password.contract.test.ts` | ✅ Pasa |
| `admin-delete-user.contract.test.ts` | ✅ Pasa |

### Tests con fallos pre-existentes (no relacionados con esta verificación)

- `admin-create-user-profile.test.ts`: importa `admin-create-user-profile` sin extensión `.ts` → `ERR_MODULE_NOT_FOUND`.
- `admin-delete-test-user.contract.test.ts`: importa `admin-delete-test-user` sin extensión `.ts` → `ERR_MODULE_NOT_FOUND`.
- `admin-media-backup.contract.test.ts`: regex espera `"EVIDENCIAS COPIADAS"` que no aparece en `BackupCenter.tsx`.
- `Usuarios.edit-profile.contract.test.ts`: regex con acentos mal escapados (`perder\?`, `borrar\?`) falla contra el contenido actual.

Ninguno de estos fallos afecta la disponibilidad de la gestión de usuarios segura.

## Conclusión

**LISTO PARA DEPLOY SIN REGRESIÓN FUNCIONAL** ✅

La corrección de seguridad deshabilitó componentes legacy que ya no están en uso; la administración real de usuarios sigue operativa a través de `Usuarios.tsx` y las Netlify Functions seguras. Los bundles siguen libres de `service_role`. El único bloqueo remanente para desplegar es la ausencia de `NETLIFY_AUTH_TOKEN` en este entorno.
