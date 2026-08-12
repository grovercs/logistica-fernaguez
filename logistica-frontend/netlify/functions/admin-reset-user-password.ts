import type { Handler } from '@netlify/functions';
import type { SupabaseClient } from '@supabase/supabase-js';
import { HttpInputError, isAllowedFunctionRequest, isUuid, parseJsonBody, requireActiveAdministrator, response } from './lib/admin-user-utils';

const PASSWORD_MIN_LENGTH = 10;
const RESET_ACTION = 'admin_reset_user_password';
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RETRY_WINDOW_MS = 60 * 1000;
const MAX_ATTEMPTS_PER_WINDOW = 3;
const inFlightPasswordResets = new Set<string>();

export interface PasswordResetPayload {
  target_user_id: string;
  new_password: string;
}

export function validatePasswordResetPayload(body: Record<string, unknown>): PasswordResetPayload {
  if (!isUuid(body.target_user_id) || typeof body.new_password !== 'string' || body.new_password.length < PASSWORD_MIN_LENGTH) {
    throw new HttpInputError(400, 'Password does not meet security requirements');
  }
  return { target_user_id: body.target_user_id as string, new_password: body.new_password };
}

async function createPasswordResetAudit(admin: SupabaseClient, actorUserId: string, targetUserId: string): Promise<string> {
  const { data, error } = await admin
    .schema('public')
    .from('admin_user_audit_log')
    .insert({
      actor_user_id: actorUserId,
      target_user_id: targetUserId,
      action: RESET_ACTION,
      old_values: null,
      new_values: null,
      success: false,
      error_message: 'PENDING',
    })
    .select('id')
    .single();
  if (error || !data?.id) throw new Error('AUDIT_INITIAL_WRITE_FAILED');
  return data.id;
}

async function finalizePasswordResetAudit(admin: SupabaseClient, auditId: string, success: boolean, errorCode: string | null): Promise<void> {
  const { error } = await admin
    .schema('public')
    .from('admin_user_audit_log')
    .update({ success, error_message: errorCode })
    .eq('id', auditId);
  if (error) throw new Error('AUDIT_FINALIZE_FAILED');
}

async function enforcePasswordResetRateLimit(admin: SupabaseClient, actorUserId: string, targetUserId: string): Promise<void> {
  const windowStart = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
  const { data, error } = await admin
    .schema('public')
    .from('admin_user_audit_log')
    .select('created_at')
    .eq('actor_user_id', actorUserId)
    .eq('target_user_id', targetUserId)
    .eq('action', RESET_ACTION)
    .gte('created_at', windowStart)
    .order('created_at', { ascending: false });
  if (error) throw new Error('RATE_LIMIT_LOOKUP_FAILED');
  const attempts = data || [];
  const mostRecent = attempts[0]?.created_at ? Date.parse(attempts[0].created_at) : Number.NaN;
  if (attempts.length >= MAX_ATTEMPTS_PER_WINDOW || (!Number.isNaN(mostRecent) && Date.now() - mostRecent < RETRY_WINDOW_MS)) {
    throw new Error('RATE_LIMITED');
  }
}

export const handler: Handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin;
  if (!isAllowedFunctionRequest(event)) return response(403, { error: 'Origin not allowed' });
  if (event.httpMethod === 'OPTIONS') return response(204, {}, origin);
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method not allowed' }, origin);

  let lockKey: string | null = null;
  try {
    const context = await requireActiveAdministrator(event);
    const payload = validatePasswordResetPayload(parseJsonBody(event, ['target_user_id', 'new_password']));

    if (payload.target_user_id === context.actorUserId) return response(403, { error: 'This password cannot be changed from this tool' }, origin);

    lockKey = `${context.actorUserId}:${payload.target_user_id}`;
    if (inFlightPasswordResets.has(lockKey)) return response(429, { error: 'Try again later' }, origin);
    inFlightPasswordResets.add(lockKey);

    const { data: authResult, error: authLookupError } = await context.admin.auth.admin.getUserById(payload.target_user_id);
    if (authLookupError || !authResult.user) return response(404, { error: 'Target user not found' }, origin);

    const { data: profile, error: profileError } = await context.admin
      .schema('public')
      .from('perfiles')
      .select('id, rol_id, activo')
      .eq('id', payload.target_user_id)
      .maybeSingle();
    if (profileError) throw new Error('PROFILE_LOOKUP_FAILED');
    if (!profile) return response(404, { error: 'Target user profile not found' }, origin);
    if (profile.activo !== true) return response(403, { error: 'Target user is not active' }, origin);
    if (!profile.rol_id) return response(403, { error: 'Target user is not eligible for password reset' }, origin);

    const { data: role, error: roleError } = await context.admin
      .schema('public')
      .from('roles')
      .select('nombre')
      .eq('id', profile.rol_id)
      .maybeSingle();
    if (roleError) throw new Error('ROLE_LOOKUP_FAILED');
    if (!role) return response(403, { error: 'Target user is not eligible for password reset' }, origin);
    if (role.nombre === 'Administrador') return response(403, { error: 'Administrator passwords cannot be changed from this tool' }, origin);

    await enforcePasswordResetRateLimit(context.admin, context.actorUserId, payload.target_user_id);
    const auditId = await createPasswordResetAudit(context.admin, context.actorUserId, payload.target_user_id);

    const { error: updateError } = await context.admin.auth.admin.updateUserById(payload.target_user_id, { password: payload.new_password });
    if (updateError) {
      try {
        await finalizePasswordResetAudit(context.admin, auditId, false, 'AUTH_UPDATE_FAILED');
      } catch {
        // The initial audit entry remains deliberately non-successful; never expose Auth details.
      }
      return response(500, { error: 'Unable to update password' }, origin);
    }

    try {
      await finalizePasswordResetAudit(context.admin, auditId, true, null);
    } catch {
      // Auth is not transactionally coupled to Postgres: do not invite an unsafe retry.
      return response(500, { error: 'Password change could not be confirmed. Contact support before retrying.' }, origin);
    }

    return response(200, { success: true, user_id: payload.target_user_id }, origin);
  } catch (error) {
    if (error instanceof HttpInputError) return response(error.statusCode, { error: error.message }, origin);
    const code = error instanceof Error ? error.message : 'UNKNOWN';
    if (code === 'UNAUTHORIZED') return response(401, { error: 'Unauthorized' }, origin);
    if (code === 'FORBIDDEN') return response(403, { error: 'Administrator access required' }, origin);
    if (code === 'RATE_LIMITED') return response(429, { error: 'Try again later' }, origin);
    if (code === 'AUDIT_INITIAL_WRITE_FAILED') return response(500, { error: 'Unable to start password reset audit' }, origin);
    console.error('admin credential reset failed');
    return response(500, { error: 'Unable to update password' }, origin);
  } finally {
    if (lockKey) inFlightPasswordResets.delete(lockKey);
  }
};
