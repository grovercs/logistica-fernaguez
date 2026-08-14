import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/pages/mobile/MobileOrdenes.tsx'), 'utf8');
const detailSource = readFileSync(resolve(process.cwd(), 'src/pages/mobile/MobileDetalleOrden.tsx'), 'utf8');

assert.match(source, /roleName === 'Trabajador'/);
assert.match(source, /from\('orden_asignaciones'\)/);
assert.match(source, /orden:ordenes!inner/);
assert.match(source, /nombre_obra/);
assert.match(source, /\.in\('estado', \['pendiente', 'en_progreso'\]\)/);
assert.match(source, /\.neq\('ordenes\.estado', 'Finalizada'\)/);
assert.match(source, /\.neq\('ordenes\.estado', 'Papelera'\)/);
assert.match(source, /fecha_asignacion/);
assert.match(source, /hora_asignacion/);
assert.match(source, /estado_asignacion/);
assert.match(source, /notas_asignacion/);
assert.match(source, /asignacion_creada_en/);
assert.match(source, /orden_creado_en/);
assert.match(source, /assignmentDateB - assignmentDateA/);
assert.match(source, /createdB - createdA/);
assert.match(source, /orderCreatedB - orderCreatedA/);
assert.match(source, /isCreatedToday\(orden\.asignacion_creada_en\)/);
assert.match(source, /key=\{orden\.asignacion_id \|\| orden\.id\}/);
assert.match(source, /setLoadError/);
assert.match(source, /onClick=\{refreshData\}/);
assert.match(source, /user_id_prefix: userId\.slice\(0, 8\)/);
assert.match(source, /code: error\.code \?\? 'unknown'/);
assert.match(source, /Fecha original de la obra:/);
assert.match(source, /orden\.nombre_obra \|\| orden\.cliente \|\| orden\.id_legible/);
assert.match(source, /Cliente: \{orden\.cliente \|\| 'No especificado'\}/);
assert.match(detailSource, /orden\?\.nombre_obra \|\| orden\?\.cliente \|\| orden\?\.id_legible/);
assert.match(detailSource, /Cliente: \{orden\?\.cliente \|\| 'No especificado'\}/);
assert.match(detailSource, /orden\?\.descripcion \|\|/);
assert.doesNotMatch(source, /service_role/i);

console.log('mobile worker assignment list contract tests passed');
