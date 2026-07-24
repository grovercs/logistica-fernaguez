# 📋 Registro de Incidencias — Logística Fernaguez

Este documento recoge los problemas detectados, su causa raíz y la solución aplicada.
Actualízalo cada vez que se resuelva un bug relevante.

---

## INC-001 · Técnico aparece como "Técnico" en el detalle de la orden

**Fecha:** 29/05/2026  
**Detectado en:** Orden `OB-2026-0001`, sección *Registros de los Técnicos*  
**Síntoma:** El reporte de **Cristian Patrascu** (7.5h) aparecía con el nombre genérico "Técnico" en lugar de su nombre real.

### Causa raíz

Cristian tenía **dos cuentas distintas en Supabase Auth** con el mismo email (`pinturas.fernaguez@gmail.com`):

| Campo | Valor |
|---|---|
| `auth_user_id` registrado en `trabajadores` | `4ca03229-b2d1-48f2-9500-1a1104ed05d6` ← INCORRECTO |
| `auth_user_id` con el que realmente inicia sesión en la app | `54c354c3-5786-4175-a1dd-c66055d7b0b7` ← CORRECTO |

El código en `OrdenDetalle.tsx` (línea ~559) busca al técnico así:
```ts
const worker = trabajadores.find(t => t.auth_user_id === rep.tecnico_id);
```
Al no coincidir el `auth_user_id` guardado en `trabajadores` con el que usa la app, no le encontraba y caía en el fallback `'Técnico'`.

### Cómo diagnosticarlo si vuelve a pasar

1. Ejecutar en la consola SQL de Supabase (o con Node + service role key):

```sql
-- 1. Ver el trabajador afectado
SELECT id, nombre, apellidos, auth_user_id
FROM trabajadores
WHERE nombre ILIKE '%NombreTrabajador%';

-- 2. Ver el tecnico_id guardado en los reportes de la orden
SELECT id, tecnico_id, horas_trabajadas
FROM reportes
WHERE orden_id = 'UUID_DE_LA_ORDEN';

-- 3. Comparar: si el tecnico_id del reporte NO coincide con ningún
--    trabajadores.id ni trabajadores.auth_user_id → problema de doble cuenta.

-- 4. Verificar en auth.users a quién pertenece ese tecnico_id
SELECT id, email, created_at
FROM auth.users
WHERE id = 'tecnico_id_del_reporte';
```

2. Si el email de `auth.users` coincide con el trabajador → **es un problema de doble cuenta**.

### Solución aplicada

```sql
-- Actualizar el auth_user_id del trabajador para que apunte a la cuenta real
UPDATE trabajadores
SET auth_user_id = '54c354c3-5786-4175-a1dd-c66055d7b0b7'  -- ID real (el que usa la app)
WHERE id = '6b818de8-8ca5-4855-a801-82016a92452b';          -- ID interno de Cristian
```

Para futuros casos, el patrón genérico es:
```sql
UPDATE trabajadores
SET auth_user_id = 'AUTH_ID_QUE_USA_LA_APP'
WHERE id = 'ID_INTERNO_DEL_TRABAJADOR';
```

### Cómo prevenir esto

- Cuando se crea el acceso de un trabajador desde el panel (`CrearAccesoModal`), asegurarse de que el `auth_user_id` que se guarda en `trabajadores` coincide exactamente con el que Supabase asigna.
- Si un trabajador cierra sesión y vuelve a registrarse (en lugar de iniciar sesión), Supabase crea una nueva cuenta y el `auth_user_id` cambia.
- **Solución preventiva a futuro:** en `CrearAccesoModal`, después de crear el usuario en Auth, actualizar `trabajadores.auth_user_id` con el nuevo UUID devuelto por Supabase.

---

*Añade nuevas incidencias siguiendo el mismo formato: INC-002, INC-003...*
