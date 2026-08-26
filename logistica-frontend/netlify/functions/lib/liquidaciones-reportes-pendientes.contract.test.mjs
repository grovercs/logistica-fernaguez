import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const source = readFileSync(
  resolve(__dirname, '../../../../supabase/migrations/20260826_add_liquidacion_reportes_pendientes.sql'),
  'utf8',
);

const frontendSource = readFileSync(
  resolve(__dirname, '../../../src/components/liquidaciones/LiquidacionesGestion.tsx'),
  'utf8',
);

// 1. La migración crea la RPC con la firma esperada.
assert.match(source, /CREATE OR REPLACE FUNCTION public\.admin_get_liquidacion_reportes_pendientes\(/);
assert.match(source, /p_liquidacion_id uuid/);
assert.match(source, /RETURNS TABLE \(/);
assert.match(source, /reportes_pendientes integer/);
assert.match(source, /horas_pendientes numeric/);

// 2. Es de solo lectura y segura.
assert.match(source, /LANGUAGE plpgsql/);
assert.match(source, /STABLE/);
assert.match(source, /SECURITY DEFINER/);
assert.match(source, /SET search_path = ''/);

// 3. Usa los mismos criterios de inclusión que admin_recalcular_liquidacion.
assert.match(source, /r\.tecnico_id = v_auth_user_id/);
assert.match(source, /r\.fecha_trabajo >= v_periodo/);
assert.match(source, /r\.fecha_trabajo < \(v_periodo \+ INTERVAL '1 month'\)::date/);
assert.match(source, /o\.estado <> 'Papelera'/);
assert.match(source, /NOT EXISTS \(/);
assert.match(source, /FROM public\.liquidacion_lineas AS ll/);
assert.match(source, /WHERE ll\.reporte_id = r\.id/);

// 4. Autorización y permisos correctos.
assert.match(source, /private\.current_user_is_liquidaciones_autorizado\(\)/);
assert.match(source, /REVOKE EXECUTE ON FUNCTION public\.admin_get_liquidacion_reportes_pendientes\(uuid\)/);
assert.match(source, /GRANT EXECUTE ON FUNCTION public\.admin_get_liquidacion_reportes_pendientes\(uuid\)/);
assert.match(source, /TO authenticated/);
assert.match(source, /FROM PUBLIC, anon/);

// 5. No modifica datos.
assert.doesNotMatch(source, /INSERT INTO public\.liquidaciones/);
assert.doesNotMatch(source, /UPDATE public\.liquidaciones/);
assert.doesNotMatch(source, /DELETE FROM public\.liquidaciones/);
assert.doesNotMatch(source, /INSERT INTO public\.liquidacion_lineas/);

// 6. Devuelve 0/0 para liquidación no abierta o inexistente.
assert.match(source, /v_estado IS DISTINCT FROM 'abierta'/);
assert.match(source, /SELECT 0::integer, 0::numeric/);

// 7. Frontend usa la RPC, maneja snake_case a camelCase y muestra aviso.
assert.match(frontendSource, /admin_get_liquidacion_reportes_pendientes/);
assert.match(frontendSource, /reportes_pendientes/);
assert.match(frontendSource, /horas_pendientes/);
assert.match(frontendSource, /reportesPendientes/);
assert.match(frontendSource, /horasPendientes/);
assert.match(frontendSource, /pendingMap/);
assert.match(frontendSource, /fetchReportesPendientes/);
assert.match(frontendSource, /parte\{pending\.reportesPendientes > 1 \? 's' : ''\} nuevo/);

console.log('liquidaciones reportes pendientes contract tests passed');
