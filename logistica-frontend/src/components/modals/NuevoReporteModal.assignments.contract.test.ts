import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd(), '..');
const modal = readFileSync(resolve(root, 'logistica-frontend/src/components/modals/NuevoReporteModal.tsx'), 'utf8');
const section = readFileSync(resolve(root, 'logistica-frontend/src/components/AsignacionesSection.tsx'), 'utf8');
const helper = readFileSync(resolve(root, 'logistica-frontend/src/lib/orderAssignments.ts'), 'utf8');
const mobile = readFileSync(resolve(root, 'logistica-mobile/src/pages/mobile/MobileOrdenes.tsx'), 'utf8');

assert.match(helper, /from\('orden_asignaciones'\)[\s\S]*trabajador_id: worker\.id/);
assert.match(helper, /estado: 'pendiente'/);
assert.match(helper, /tecnico_id: worker\.auth_user_id \|\| worker\.id/);
assert.match(helper, /from\('ordenes'\)[\s\S]*\.update\(updates\)/);
assert.match(helper, /return \{ legacySyncError \}/);
assert.match(section, /import \{ createOrderAssignment \} from '..\/lib\/orderAssignments'/);
assert.match(section, /await createOrderAssignment\([\s\S]*notas: formNotas/);
assert.match(modal, /import \{ createOrderAssignment \} from '..\/..\/lib\/orderAssignments'/);
assert.match(modal, /await createOrderAssignment\([\s\S]*worker: selectedTecnico/);
assert.match(modal, /tecnico_id: null/);
assert.match(modal, /assignmentResult\.legacySyncError/);
assert.match(modal, /order_assignment_create_failed/);
assert.match(modal, /order_assignment_legacy_sync_failed/);
assert.match(modal, /La orden \$\{newOrder\.id_legible\} se ha creado, pero no pudo asignarse al técnico/);
assert.match(modal, /if \(selectedTecnico && selectedTecnico\.telegram_chat_id\)/);
assert.doesNotMatch(modal, /from\('orden_asignaciones'\)\.insert/);
const assignmentCallIndex = modal.indexOf('await createOrderAssignment');
const assignmentFailureIndex = modal.indexOf('order_assignment_create_failed');
const notificationIndex = modal.indexOf('Notificación Telegram al técnico');
assert.ok(assignmentCallIndex >= 0 && assignmentFailureIndex > assignmentCallIndex);
assert.ok(notificationIndex > assignmentFailureIndex);
assert.match(mobile, /\.from\('orden_asignaciones'\)/);
assert.match(mobile, /\.in\('estado', \['pendiente', 'en_progreso'\]\)/);

console.log('new order assignment contract tests passed');
