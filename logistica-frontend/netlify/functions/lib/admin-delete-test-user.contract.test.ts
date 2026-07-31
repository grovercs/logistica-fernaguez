import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateDeleteTestUserPayload } from '../admin-delete-test-user';

const targetUserId = '12345678-1234-4123-8123-123456789abc';
assert.deepEqual(
  validateDeleteTestUserPayload({ target_user_id: targetUserId, confirmation_email: 'test@example.com' }),
  { target_user_id: targetUserId, confirmation_email: 'test@example.com' },
);
assert.throws(() => validateDeleteTestUserPayload({ target_user_id: targetUserId, confirmation_email: '' }), /Invalid test user deletion payload/);
assert.throws(() => validateDeleteTestUserPayload({ target_user_id: 'not-a-uuid', confirmation_email: 'test@example.com' }), /Invalid test user deletion payload/);

// Contrato est?tico: las llamadas reales requieren Supabase, por lo que no se
// ejecutan aqu? ni se necesitan secretos.
const source = readFileSync(resolve(process.cwd(), 'netlify/functions/admin-delete-test-user.ts'), 'utf8');
assert.match(source, /event\.httpMethod !== 'POST'/);
assert.match(source, /if \(!isAllowedFunctionRequest\(event\)\) return response\(403/);
assert.match(source, /if \(event\.httpMethod === 'OPTIONS'\) return response\(204/);
assert.match(source, /if \(code === 'UNAUTHORIZED'\) return response\(401/);
assert.match(source, /if \(code === 'FORBIDDEN' \|\| code === 'ADMIN_FORBIDDEN'\) return response\(403/);
assert.match(source, /if \(authError \|\| !authUser\) return response\(404/);
assert.match(source, /if \(profile\) return response\(409/);
assert.match(source, /if \(worker\) return response\(409/);
assert.match(source, /if \(\(storageCount \|\| 0\) > 0\) return response\(409/);
assert.match(source, /if \(error instanceof HttpInputError\) return response\(error\.statusCode/);
assert.match(source, /parseJsonBody\(event, \['target_user_id', 'confirmation_email'\]\)/);
assert.match(source, /requireActiveAdministrator\(event\)/);
assert.match(source, /payload\.target_user_id === context\.actorUserId/);
assert.match(source, /auth\.admin\.getUserById/);
assert.match(source, /confirmation_email !== authUser\.email/);
assert.match(source, /from\('perfiles'\)/);
assert.match(source, /from\('trabajadores'\)/);
assert.match(source, /rpc\('admin_test_user_owns_storage_objects'/);
assert.match(source, /p_actor_user_id: context\.actorUserId/);
assert.match(source, /p_target_user_id: payload\.target_user_id/);
assert.doesNotMatch(source, /schema\('storage'\)\.from\('objects'\)/);
assert.match(source, /code: 'storage_check_failed'/);
assert.match(source, /code: 'storage_objects_owned'/);
assert.match(source, /code: 'audit_failed'/);
assert.match(source, /code: 'auth_delete_failed'/);
assert.match(source, /logStage\('target_lookup'/);
assert.match(source, /logStage\('profile_check'/);
assert.match(source, /logStage\('worker_link_check'/);
assert.match(source, /logStage\('storage_ownership_check'/);
assert.match(source, /logStage\('audit_insert'/);
assert.match(source, /logStage\('auth_delete'/);
assert.match(source, /logStage\('audit_finalize'/);
assert.match(source, /auditDeletionAttempt/);
assert.match(source, /auth\.admin\.deleteUser\(payload\.target_user_id\)/);
assert.match(source, /markDeletionAudit\(context\.admin, auditId, false, 'AUTH_DELETE_FAILED'\)/);
assert.match(source, /markDeletionAudit\(context\.admin, auditId, true, null\)/);
assert.match(source, /return response\(409, \{ error: 'Accounts with a profile cannot be deleted here'/);
assert.match(source, /return response\(409, \{ error: 'Accounts linked to a worker cannot be deleted here'/);
assert.match(source, /return response\(409, \{ error: 'Accounts with Storage objects cannot be deleted here'/);
assert.ok(source.indexOf("code: 'storage_objects_owned'") < source.indexOf('auditDeletionAttempt'));
assert.doesNotMatch(source, /DELETE\s+FROM\s+auth\.users/i);
assert.doesNotMatch(source, /DELETE\s+FROM\s+storage\.objects/i);

const migration = readFileSync(resolve(process.cwd(), '../supabase/migrations/20260731_add_admin_storage_ownership_check.sql'), 'utf8');
assert.match(migration, /CREATE OR REPLACE FUNCTION public\.admin_test_user_owns_storage_objects\(/);
assert.match(migration, /SECURITY DEFINER/);
assert.match(migration, /SET search_path = ''/);
assert.match(migration, /FROM public\.perfiles AS p/);
assert.match(migration, /INNER JOIN public\.roles AS r/);
assert.match(migration, /r\.nombre = 'Administrador'/);
assert.match(migration, /FROM storage\.objects AS o/);
assert.match(migration, /o\.owner = p_target_user_id/);
assert.match(migration, /o\.owner_id = p_target_user_id::text/);
assert.match(migration, /FROM PUBLIC, anon, authenticated/);
assert.match(migration, /TO service_role/);
assert.doesNotMatch(migration, /DELETE\s+FROM\s+storage\.objects/i);
assert.doesNotMatch(source, /console\.(?:log|error).*?(?:token|service|authorization|confirmation_email)/i);

console.log('admin delete test user contract tests passed');
