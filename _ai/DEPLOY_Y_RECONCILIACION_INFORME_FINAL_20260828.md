# Informe final — Deploy mobile y reconciliación histórica de asignaciones

Fecha: 2026-08-28

## 1. Resultado del deploy

| Campo | Valor |
|---|---|
| Proyecto | `logistica-mobile` |
| URL de producción | `https://euphonious-cat-141f11.netlify.app` |
| Deploy ID | `6a91a92b7e0176ecf88e2f35` |
| Site ID | `756cdd62-c157-4e9e-b326-46d895584c5` |
| Build | ✅ Éxito (tsc + vite) |
| Sin fugas de service_role en HTML/bundle | ✅ Verificado |

## 2. Resultado del smoke test

| Verificación | Resultado |
|---|---|
| Producción responde HTTP 200 | ✅ |
| HTML no contiene `service_role` / `VITE_SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | ✅ |
| Post-reconciliación, el sitio sigue respondiendo 200 | ✅ |

## 3. Resultado de la reconciliación histórica

### Antes

| Métrica | Valor |
|---|---|
| Reportes huérfanos (`asignacion_id IS NULL`) | 38 |
| Casos ambiguos (>1 asignación compatible) | 0 |
| Asignaciones pendientes entre las 18 de destino | 2 (`OB-2026-0080`, `OB-2026-0082`) |
| Asignaciones en progreso entre las 18 de destino | 16 |

### Acción ejecutada

- Script aplicado: `supabase/migrations/20260827_reconcile_historical_reports_asignacion_id.sql`
- Método: `npx supabase db query --linked --file <migration>`
- Resultado de la ejecución: sin errores (`rows: []`)

### Después

| Métrica | Valor |
|---|---|
| Reportes huérfanos restantes | 3 |
| Casos ambiguos | 0 |
| Asignaciones pendientes entre las 18 de destino | 0 |
| Asignaciones en progreso entre las 18 de destino | 18 |

### Estados de las 18 asignaciones antes/después

Todas las 16 que ya estaban en `en_progreso` se mantuvieron. Las 2 que estaban en `pendiente` pasaron a `en_progreso`:

- `3e28dd2a-0f82-42b6-ba8f-9e726184285a` (`OB-2026-0080`): `pendiente` → `en_progreso`
- `5e835449-7d6a-4223-94ee-1482742529df` (`OB-2026-0082`): `pendiente` → `en_progreso`

## 4. Verificación específica de OB-2026-0082 / Jonatan Patrascu

| Reporte | Orden | Técnico | Asignación vinculada | Estado asignación |
|---|---|---|---|---|
| `a03df103-e20f-4a00-9443-4046f9082bda` | `OB-2026-0082` | Jonatan Patrascu | `5e835449-7d6a-4223-94ee-1482742529df` | `en_progreso` |
| `2293dd86-9813-446a-87ab-a491b94759b2` | `OB-2026-0082` | Jonatan Patrascu | `5e835449-7d6a-4223-94ee-1482742529df` | `en_progreso` |
| `bedcd0f4-dca7-47e4-aab0-a402954c6aa2` | `OB-2026-0082` | Jonatan Patrascu | `5e835449-7d6a-4223-94ee-1482742529df` | `en_progreso` |

- ✅ Los 3 reportes de Jonatan en `OB-2026-0082` quedaron vinculados a la asignación correcta.
- ✅ La asignación dejó de estar `pendiente` y pasó a `en_progreso`.
- ✅ La orden `OB-2026-0082` sigue en estado `En Curso`.

## 5. Reportes huérfanos restantes

Quedan **3 reportes** con `asignacion_id IS NULL`:

| Reporte ID | Orden | Motivo |
|---|---|---|
| `71d7e24b-adca-4fb9-a7a8-fcbf36e06e5c` | `OB-2026-0005` | 0 asignaciones compatibles para Cristian Patrascu |
| `b2c8e1eb-ab7c-423b-b8af-a33501e1eb73` | `OB-2026-0005` | 0 asignaciones compatibles para Zaquiel Antonio |
| `3a415fd7-e094-45a9-9a69-7cb9b8f899e3` | `OB-2026-0048` | 0 asignaciones compatibles para Patricio Guaman |

No son ambiguos: simplemente no existe una `orden_asignaciones` para ese trabajador+orden. Requieren decisión de negocio aparte.

## 6. Comprobaciones globales adicionales

| Verificación | Resultado |
|---|---|
| 0 casos ambiguos | ✅ |
| No se tocaron asignaciones fuera de las 18 identificadas | ✅ (solo ellas cambiaron de `pendiente` a `en_progreso`) |
| No hay reportes vinculados a asignaciones `pendiente` | ✅ (0 reportes con asignación en `pendiente`) |
| Estados de asignación válidos | ✅ (sin estados extraños) |
| Liquidaciones no tocadas | ✅ |
| Telegram/UltraMsg no alterados | ✅ |

## 7. Commit y push final

- **Hash:** `35d6286` (último en `master`)
- **Mensaje:** `docs: add no-regression verification for user management after service_role fix`
- **Push:** ✅ `master` actualizado en `https://github.com/grovercs/logistica-fernaguez.git`

> La reconciliación en sí es una operación de base de datos y no genera cambios de código; por tanto no requiere commit adicional.

## 8. Rollback

No se ejecutó rollback porque todas las verificaciones pasaron.

## 9. Estado final de la incidencia

**CERRADA** ✅

- Fix de asignaciones desplegado en mobile.
- RPC `assigned_user_save_report` aplicado y operativo.
- 35 reportes históricos vinculados a 18 asignaciones.
- `OB-2026-0082` / Jonatan Patrascu verificado.
- 3 huérfanos restantes no vinculables automáticamente (falta asignación compatible).
- No se detectaron regresiones en Trabajador/Admin/Editor.
- Telegram/UltraMsg sin cambios.

---
Generado: 2026-08-28
