import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizeEmail, validateCreateUserPayload } from '../admin-create-user';

const roleId = '12345678-1234-4123-8123-123456789abc';
const password = 'minimum-ten';

assert.equal(normalizeEmail('  USER@Example.COM '), 'user@example.com');
assert.deepEqual(
  validateCreateUserPayload({ email: 'user@example.com', nombre_completo: 'Usuario de prueba', rol_id: roleId, activo: true, password }),
  { email: 'user@example.com', nombre_completo: 'Usuario de prueba', rol_id: roleId, activo: true, password },
);
assert.throws(() => validateCreateUserPayload({ email: 'invalid-email', nombre_completo: null, rol_id: roleId, activo: true, password }), /Invalid user creation payload/);
assert.throws(() => validateCreateUserPayload({ email: 'user@example.com', nombre_completo: null, rol_id: roleId, activo: true, password: 'short' }), /Invalid user creation payload/);
assert.throws(() => validateCreateUserPayload({ email: 'user@example.com', nombre_completo: 'x'.repeat(121), rol_id: roleId, activo: true, password }), /Invalid user creation payload/);

const source = readFileSync(resolve(process.cwd(), 'netlify/functions/admin-create-user.ts'), 'utf8');
const migration = readFileSync(resolve(process.cwd(), '../supabase/migrations/20260813_add_admin_create_managed_user.sql'), 'utf8');

assert.match(source, /event\.httpMethod !== 'POST'/);
assert.match(source, /if \(!isAllowedFunctionRequest\(event\)\) return response\(403/);
assert.match(source, /if \(event\.httpMethod === 'OPTIONS'\) return response\(204/);
assert.match(source, /requireActiveAdministrator\(event\)/);
assert.match(source, /parseJsonBody\(event, \['email', 'nombre_completo', 'rol_id', 'activo', 'password'\]\)/);
assert.match(source, /PASSWORD_MIN_LENGTH = 10/);
assert.match(source, /role\.nombre === 'Administrador'/);
assert.match(source, /Administrator accounts cannot be created from this tool/);
assert.match(source, /action: CREATE_USER_ACTION/);
assert.match(source, /error_message: 'PENDING'/);
assert.match(source, /auth\.admin\.createUser\(\{/);
assert.match(source, /email_confirm: true/);
assert.match(source, /context\.admin\.rpc\('admin_create_managed_user'/);
assert.match(source, /auth\.admin\.deleteUser\(createdUserId\)/);
assert.match(source, /PROFILE_CREATE_FAILED_COMPENSATED/);
assert.match(source, /PROFILE_CREATE_FAILED_COMPENSATION_FAILED/);
assert.match(source, /EMAIL_ALREADY_EXISTS/);
assert.match(source, /RATE_WINDOW_MS = 15 \* 60 \* 1000/);
assert.match(source, /RETRY_WINDOW_MS = 60 \* 1000/);
assert.match(source, /inFlightUserCreations/);
assert.match(source, /return response\(201, \{ success: true, user_id: createdUserId/);
assert.doesNotMatch(source, /user_metadata|raw_user_meta_data|supabaseAdmin/);
assert.doesNotMatch(source, /console\.(?:log|info|error).*password/i);
assert.doesNotMatch(source, /new_values:\s*\{[^}]*password/i);

assert.match(migration, /CREATE OR REPLACE FUNCTION public\.admin_create_managed_user/);
assert.match(migration, /SECURITY DEFINER/);
assert.match(migration, /SET search_path = ''/);
assert.match(migration, /ADMIN_FORBIDDEN/);
assert.match(migration, /ADMIN_ROLE_NOT_ALLOWED/);
assert.match(migration, /INSERT INTO public\.perfiles \(id, nombre_completo, rol_id, activo\)/);
assert.match(migration, /UPDATE public\.admin_user_audit_log/);
assert.match(migration, /'target_user_id', p_target_user_id::text/);
assert.match(migration, /REVOKE EXECUTE[\s\S]*FROM PUBLIC, anon, authenticated/);
assert.match(migration, /GRANT EXECUTE[\s\S]*TO service_role/);
assert.doesNotMatch(migration, /DELETE\s+FROM|user_metadata|raw_user_meta_data/);

console.log('admin create user contract tests passed');
