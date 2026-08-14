import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd(), '..');
const newOrderSource = readFileSync(resolve(root, 'logistica-frontend/src/components/modals/NuevoReporteModal.tsx'), 'utf8');
const editOrderSource = readFileSync(resolve(root, 'logistica-frontend/src/components/modals/EditarOrdenModal.tsx'), 'utf8');
const calendarSource = readFileSync(resolve(root, 'logistica-frontend/src/pages/Calendario.tsx'), 'utf8');
const ordersSource = readFileSync(resolve(root, 'logistica-frontend/src/pages/Ordenes.tsx'), 'utf8');
const migration = readFileSync(resolve(root, 'supabase/migrations/20260814_add_order_work_name.sql'), 'utf8');

assert.match(migration, /ALTER TABLE public\.ordenes[\s\S]*ADD COLUMN IF NOT EXISTS nombre_obra text NULL/);
assert.match(migration, /COMMENT ON COLUMN public\.ordenes\.nombre_obra/);
assert.match(newOrderSource, /nombre_obra: ''/);
assert.match(newOrderSource, /nombre_obra: formData\.nombre_obra/);
assert.match(newOrderSource, /CLIENTE \/ EMPRESA/);
assert.match(newOrderSource, /NOMBRE DE LA OBRA/);
assert.match(newOrderSource, /descripcion: formData\.observaciones/);
assert.match(editOrderSource, /nombre_obra: ordenData\.nombre_obra \|\| ''/);
assert.match(editOrderSource, /nombre_obra: formData\.nombre_obra/);
assert.match(editOrderSource, /CLIENTE \/ EMPRESA/);
assert.match(editOrderSource, /NOMBRE DE LA OBRA/);
assert.match(editOrderSource, /DIRECCIÓN COMPLETA DE INTERVENCIÓN/);
assert.match(editOrderSource, /aseguradora: formData\.aseguradora/);
assert.match(editOrderSource, /aseguradora: ordenData\.aseguradora \|\| ''/);
assert.doesNotMatch(editOrderSource, /EMPRESA \/ ASEGURADORA DE REFERENCIA/);
assert.doesNotMatch(editOrderSource, /<select[\s\S]*value=\{formData\.aseguradora\}/);
assert.match(editOrderSource, /DNI \/ CIF/);
assert.match(editOrderSource, /Persona responsable \/ Contacto/);
assert.match(calendarSource, /rep\.ordenes\?\.nombre_obra \|\| rep\.ordenes\?\.cliente \|\| rep\.ordenes\?\.id_legible/);
assert.match(calendarSource, /orden\.nombre_obra \|\| orden\.cliente \|\| orden\.id_legible/);
assert.match(calendarSource, /\(o\.nombre_obra \|\| ''\)\.toLowerCase\(\)\.includes\(lower\)/);
assert.match(ordersSource, /orden\.nombre_obra \|\| orden\.cliente \|\| orden\.id_legible/);
assert.match(ordersSource, /o\.nombre_obra/);

console.log('order work name contract tests passed');
