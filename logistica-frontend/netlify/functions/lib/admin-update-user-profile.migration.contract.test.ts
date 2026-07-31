import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sql = readFileSync(resolve(process.cwd(), '../supabase/migrations/20260730_add_admin_update_user_profile.sql'), 'utf8');

assert.match(sql, /^BEGIN;/);
assert.match(sql, /CREATE OR REPLACE FUNCTION public\.admin_update_user_profile\(p_actor_user_id uuid,p_target_user_id uuid,p_nombre_completo text,p_rol_id uuid,p_activo boolean,p_trabajador_id uuid,p_confirm_active_assignments boolean DEFAULT false\)/);
assert.match(sql, /SECURITY DEFINER SET search_path = ''/);
assert.match(sql, /ADMIN_FORBIDDEN/);
assert.match(sql, /USER_PROFILE_NOT_FOUND/);
assert.match(sql, /ROLE_NOT_FOUND/);
assert.match(sql, /FOR UPDATE OF p/);
assert.match(sql, /pg_advisory_xact_lock/);
assert.match(sql, /WORKER_LINK_CONFLICT/);
assert.match(sql, /estado IN \('pendiente','en_progreso'\)/);
assert.match(sql, /ADMIN_LINK_CONFIRMATION_REQUIRED/);
assert.match(sql, /LAST_ACTIVE_ADMINISTRATOR/);
assert.match(sql, /UPDATE public\.perfiles SET nombre_completo=p_nombre_completo,rol_id=p_rol_id,activo=p_activo/);
assert.match(sql, /UPDATE public\.trabajadores SET auth_user_id=NULL/);
assert.match(sql, /UPDATE public\.trabajadores SET auth_user_id=p_target_user_id/);
assert.match(sql, /INSERT INTO public\.admin_user_audit_log[\s\S]*old_values[\s\S]*new_values/);
assert.match(sql, /REVOKE EXECUTE[\s\S]*FROM PUBLIC,anon,authenticated/);
assert.match(sql, /GRANT EXECUTE[\s\S]*TO service_role/);
assert.doesNotMatch(sql, /\bDELETE\b|auth\.users\s+(?:SET|UPDATE)|raw_user_meta_data|public\.profiles\.role/);
assert.match(sql, /COMMIT;\s*$/);

console.log('admin update user profile migration contract tests passed');
