import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateDeleteUserPayload } from '../admin-delete-user';

const targetUserId = '12345678-1234-4123-8123-123456789abc';
assert.deepEqual(
  validateDeleteUserPayload({ target_user_id: targetUserId, confirmation_email: 'test@example.com' }),
  { target_user_id: targetUserId, confirmation_email: 'test@example.com' },
);
assert.throws(() => validateDeleteUserPayload({ target_user_id: targetUserId, confirmation_email: ' ' }), /Invalid user deletion payload/);
assert.throws(() => validateDeleteUserPayload({ target_user_id: 'not-a-uuid', confirmation_email: 'test@example.com' }), /Invalid user deletion payload/);

// Contrato estático: las integraciones Auth/Postgres/Storage se prueban en el
// Deploy Preview. Estas aserciones garantizan que el endpoint no omita límites.
const source = readFileSync(resolve(process.cwd(), 'netlify/functions/admin-delete-user.ts'), 'utf8');
assert.match(source, /event\.httpMethod !== 'POST'/);
assert.match(source, /if \(!isAllowedFunctionRequest\(event\)\) return response\(403/);
assert.match(source, /if \(event\.httpMethod === 'OPTIONS'\) return response\(204/);
assert.match(source, /requireActiveAdministrator\(event\)/);
assert.match(source, /parseJsonBody\(event, \['target_user_id', 'confirmation_email'\]\)/);
assert.match(source, /payload\.target_user_id === context\.actorUserId/);
assert.match(source, /auth\.admin\.getUserById\(payload\.target_user_id\)/);
assert.match(source, /normalizeEmail\(payload\.confirmation_email\) !== normalizeEmail\(authUser\.email\)/);
assert.match(source, /from\('perfiles'\)/);
assert.match(source, /from\('roles'\)/);
assert.match(source, /role\.nombre === 'Administrador'/);
assert.match(source, /from\('trabajadores'\)/);
assert.match(source, /from\('orden_asignaciones'\)/);
assert.match(source, /from\('reportes'\)/);
assert.match(source, /from\('ordenes'\)/);
assert.match(source, /from\('backup_jobs'\)/);
assert.match(source, /from\('admin_user_audit_log'\)/);
assert.match(source, /eq\('actor_user_id', payload\.target_user_id\)/);
assert.doesNotMatch(source, /eq\('target_user_id', payload\.target_user_id\)/);
assert.match(source, /rpc\('admin_test_user_owns_storage_objects'/);
assert.doesNotMatch(source, /schema\('storage'\)\.from\('objects'\)/);
assert.match(source, /code: 'activity_associated'/);
assert.match(source, /action: DELETE_USER_ACTION/);
assert.match(source, /target_user_id: targetUserId/);
assert.match(source, /PENDING_AUTH_DELETION/);
assert.match(source, /auth\.admin\.deleteUser\(payload\.target_user_id\)/);
assert.match(source, /finalizeDeletionAudit\(context\.admin, auditId, false, 'AUTH_DELETE_FAILED'\)/);
assert.match(source, /finalizeDeletionAudit\(context\.admin, auditId, true, null\)/);
assert.match(source, /target_user_id becomes NULL in this row/);
assert.match(source, /return response\(401/);
assert.match(source, /return response\(403/);
assert.match(source, /return response\(404/);
assert.match(source, /return response\(409/);
assert.match(source, /return response\(500/);
assert.doesNotMatch(source, /DELETE\s+FROM\s+auth\.users/i);
assert.doesNotMatch(source, /from\('perfiles'\)\.delete\(/);
assert.doesNotMatch(source, /console\.(?:log|info|error).*?(?:token|password|authorization|confirmation_email)/i);

console.log('admin delete user contract tests passed');
