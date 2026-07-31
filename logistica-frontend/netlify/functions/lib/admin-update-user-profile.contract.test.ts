import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'netlify/functions/admin-update-user-profile.ts'), 'utf8');

// Contrato estático de la Function: no hace peticiones ni requiere secretos.
assert.match(source, /event\.httpMethod!=='POST'/);
assert.match(source, /return response\(405/);
assert.match(source, /parseJsonBody\(event,\['target_user_id','nombre_completo','rol_id','activo','trabajador_id','confirm_active_assignments'\]\)/);
assert.match(source, /isUuid\(b\.target_user_id\).*isUuid\(b\.rol_id\)/);
assert.match(source, /typeof b\.activo!=='boolean'/);
assert.match(source, /context\.admin\.rpc\('admin_update_user_profile'/);
assert.match(source, /p_confirm_active_assignments:b\.confirm_active_assignments\?\?false/);
assert.match(source, /if\(code==='UNAUTHORIZED'\)return response\(401/);
assert.match(source, /if\(code==='FORBIDDEN'\|\|code==='ADMIN_FORBIDDEN'\)return response\(403/);
assert.match(source, /USER_NOT_FOUND.*USER_PROFILE_NOT_FOUND/);
assert.match(source, /WORKER_LINK_CONFLICT.*ADMIN_LINK_CONFIRMATION_REQUIRED/);
assert.match(source, /active_assignments_count/);
assert.match(source, /isAllowedFunctionRequest\(event\)/);
assert.match(source, /requireActiveAdministrator\(event\)/);
assert.doesNotMatch(source, /auth\.admin\.|\.from\('perfiles'\)|\.from\('trabajadores'\)/);
assert.doesNotMatch(source, /console\.(?:log|error).*?(?:token|service|authorization)/i);

console.log('admin update user profile function contract tests passed');
