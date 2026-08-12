import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validatePasswordResetPayload } from '../admin-reset-user-password';

const actorId = '12345678-1234-4123-8123-123456789abc';
const password = 'minimum-ten';

assert.deepEqual(validatePasswordResetPayload({ target_user_id: actorId, new_password: password }), { target_user_id: actorId, new_password: password });
assert.throws(() => validatePasswordResetPayload({ target_user_id: actorId, new_password: 'short' }), /Password does not meet security requirements/);
assert.throws(() => validatePasswordResetPayload({ target_user_id: 'not-a-uuid', new_password: password }), /Password does not meet security requirements/);

// Contrato estático: la Function requiere servicios Auth y Postgres reales,
// por lo que estas comprobaciones garantizan sus límites sin secretos.
const source = readFileSync(resolve(process.cwd(), 'netlify/functions/admin-reset-user-password.ts'), 'utf8');
assert.match(source, /event\.httpMethod !== 'POST'/);
assert.match(source, /if \(!isAllowedFunctionRequest\(event\)\) return response\(403/);
assert.match(source, /if \(event\.httpMethod === 'OPTIONS'\) return response\(204/);
assert.match(source, /requireActiveAdministrator\(event\)/);
assert.match(source, /parseJsonBody\(event, \['target_user_id', 'new_password'\]\)/);
assert.match(source, /PASSWORD_MIN_LENGTH = 10/);
assert.match(source, /payload\.target_user_id === context\.actorUserId/);
assert.match(source, /auth\.admin\.getUserById\(payload\.target_user_id\)/);
assert.match(source, /from\('perfiles'\)/);
assert.match(source, /profile\.activo !== true/);
assert.match(source, /from\('roles'\)/);
assert.match(source, /role\.nombre === 'Administrador'/);
assert.match(source, /auth\.admin\.updateUserById\(payload\.target_user_id, \{ password: payload\.new_password \}\)/);
assert.match(source, /admin_reset_user_password/);
assert.match(source, /old_values: null/);
assert.match(source, /new_values: null/);
assert.match(source, /AUTH_UPDATE_FAILED/);
assert.match(source, /RATE_WINDOW_MS = 15 \* 60 \* 1000/);
assert.match(source, /RETRY_WINDOW_MS = 60 \* 1000/);
assert.match(source, /MAX_ATTEMPTS_PER_WINDOW = 3/);
assert.match(source, /inFlightPasswordResets/);
assert.match(source, /return response\(429/);
assert.match(source, /return response\(200, \{ success: true, user_id: payload\.target_user_id \}/);
assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY/);
assert.doesNotMatch(source, /console\.(?:log|info|error).*new_password/i);
assert.doesNotMatch(source, /console\.(?:log|info|error).*password/i);
assert.doesNotMatch(source, /new_values:\s*\{[^}]*password/i);

console.log('admin reset user password contract tests passed');
