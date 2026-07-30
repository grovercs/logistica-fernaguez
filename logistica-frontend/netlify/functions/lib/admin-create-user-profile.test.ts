import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { classifyCreateProfileError, validateCreateProfilePayload } from '../admin-create-user-profile';

const targetUserId = '12345678-1234-4123-8123-123456789abc';
const roleId = '87654321-1234-4123-8123-123456789abc';

assert.deepEqual(
  validateCreateProfilePayload({ target_user_id: targetUserId, rol_id: roleId, activo: true }),
  { target_user_id: targetUserId, rol_id: roleId, activo: true },
);
assert.throws(() => validateCreateProfilePayload({ target_user_id: targetUserId, rol_id: roleId, activo: 'true' }), /Invalid profile payload/);
assert.throws(() => validateCreateProfilePayload({ target_user_id: targetUserId, rol_id: 'not-a-role', activo: true }), /Invalid profile payload/);
assert.deepEqual(classifyCreateProfileError('USER_NOT_FOUND'), ['USER_NOT_FOUND', 404, 'Authentication user not found']);
assert.deepEqual(classifyCreateProfileError('ROLE_NOT_FOUND'), ['ROLE_NOT_FOUND', 400, 'Selected role does not exist']);
assert.deepEqual(classifyCreateProfileError('USER_PROFILE_ALREADY_EXISTS'), ['USER_PROFILE_ALREADY_EXISTS', 409, 'This account already has a profile']);
assert.equal(classifyCreateProfileError('UNEXPECTED'), undefined);

// Sin ejecutar SQL, este contrato verifica las garantias que el despliegue debe
// conservar: bloqueo por cuenta, rechazo de duplicados y auditoria atomica.
const migration = readFileSync(resolve(process.cwd(), '../supabase/migrations/20260730_add_admin_create_user_profile.sql'), 'utf8');
assert.match(migration, /pg_advisory_xact_lock\(hashtextextended\('admin_create_user_profile:'/);
assert.match(migration, /USER_PROFILE_ALREADY_EXISTS/);
assert.match(migration, /INSERT INTO public\.admin_user_audit_log/);
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.admin_create_user_profile[\s\S]*TO service_role/);
assert.doesNotMatch(migration, /public\.profiles\.role|raw_user_meta_data/);

console.log('admin create user profile tests passed');
