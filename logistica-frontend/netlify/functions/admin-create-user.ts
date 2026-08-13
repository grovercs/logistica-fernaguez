import type { Handler } from '@netlify/functions';
import type { SupabaseClient } from '@supabase/supabase-js';
import { HttpInputError, isAllowedFunctionRequest, isUuid, parseJsonBody, requireActiveAdministrator, response } from './lib/admin-user-utils';

const CREATE_USER_ACTION = 'admin_create_user';
const PASSWORD_MIN_LENGTH = 10;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RETRY_WINDOW_MS = 60 * 1000;
const MAX_ATTEMPTS_PER_WINDOW = 3;
const inFlightUserCreations = new Set<string>();

export interface CreateUserPayload {
  email: string;
  nombre_completo: string | null;
  rol_id: string;
  activo: boolean;
  password: string;
}

export const normalizeEmail = (value: string) => value.normalize('NFKC').trim().toLocaleLowerCase('en-US');

export function validateCreateUserPayload(body: Record<string, unknown>): CreateUserPayload {
  const rawName = body.nombre_completo;
  if (typeof body.email !== 'string' || typeof body.password !== 'string' || !isUuid(body.rol_id) || typeof body.activo !== 'boolean' || !(rawName === null || typeof rawName === 'string')) {
    throw new HttpInputError(400, 'Invalid user creation payload');
  }
  const email = normalizeEmail(body.email);
  const nombreCompleto = rawName === null ? null : (rawName as string).trim() || null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || body.password.length < PASSWORD_MIN_LENGTH || (nombreCompleto !== null && nombreCompleto.length > 120)) {
    throw new HttpInputError(400, 'Invalid user creation payload');
  }
  return { email, nombre_completo: nombreCompleto, rol_id: body.rol_id, activo: body.activo, password: body.password };
}

async function createInitialAudit(admin: SupabaseClient, actorUserId: string, rolId: string, activo: boolean): Promise<string> {
  const { data, error } = await admin
    .schema('public')
    .from('admin_user_audit_log')
    .insert({
      actor_user_id: actorUserId,
      target_user_id: null,
      action: CREATE_USER_ACTION,
      old_values: null,
      new_values: { target_user_id: null, rol_id: rolId, activo },
      success: false,
      error_message: 'PENDING',
    })
    .select('id')
    .single();
  if (error || !data?.id) throw new Error('AUDIT_INITIAL_WRITE_FAILED');
  return data.id;
}

async function markAuthCreated(admin: SupabaseClient, auditId: string, actorUserId: string, userId: string, rolId: string, activo: boolean): Promise<void> {
  const { data, error } = await admin
    .schema('public')
    .from('admin_user_audit_log')
    .update({
      target_user_id: userId,
      new_values: { target_user_id: userId, rol_id: rolId, activo },
      error_message: 'AUTH_CREATED_PROFILE_PENDING',
    })
    .eq('id', auditId)
    .eq('actor_user_id', actorUserId)
    .eq('action', CREATE_USER_ACTION)
    .select('id')
    .maybeSingle();
  if (error || !data?.id) throw new Error('AUDIT_AUTH_CREATED_UPDATE_FAILED');
}

async function finalizeFailedAudit(admin: SupabaseClient, auditId: string, actorUserId: string, targetUserId: string | null, rolId: string, activo: boolean, errorCode: string): Promise<void> {
  const { data, error } = await admin
    .schema('public')
    .from('admin_user_audit_log')
    .update({
      new_values: { target_user_id: targetUserId, rol_id: rolId, activo },
      success: false,
      error_message: errorCode,
    })
    .eq('id', auditId)
    .eq('actor_user_id', actorUserId)
    .eq('action', CREATE_USER_ACTION)
    .select('id')
    .maybeSingle();
  if (error || !data?.id) throw new Error('AUDIT_FINALIZE_FAILED');
}

async function enforceCreateUserRateLimit(admin: SupabaseClient, actorUserId: string): Promise<void> {
  const windowStart = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
  const { data, error } = await admin
    .schema('public')
    .from('admin_user_audit_log')
    .select('created_at')
    .eq('actor_user_id', actorUserId)
    .eq('action', CREATE_USER_ACTION)
    .gte('created_at', windowStart)
    .order('created_at', { ascending: false });
  if (error) throw new Error('RATE_LIMIT_LOOKUP_FAILED');
  const attempts = data || [];
  const mostRecent = attempts[0]?.created_at ? Date.parse(attempts[0].created_at) : Number.NaN;
  if (attempts.length >= MAX_ATTEMPTS_PER_WINDOW || (!Number.isNaN(mostRecent) && Date.now() - mostRecent < RETRY_WINDOW_MS)) {
    throw new Error('RATE_LIMITED');
  }
}

const isDuplicateAuthUserError = (error: { code?: string; message?: string } | null): boolean =>
  Boolean(error && (error.code === 'email_exists' || error.code === 'user_already_exists' || /already (?:been )?(?:registered|exists)/i.test(error.message || '')));

export const handler: Handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin;
  if (!isAllowedFunctionRequest(event)) return response(403, { error: 'Origin not allowed' });
  if (event.httpMethod === 'OPTIONS') return response(204, {}, origin);
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method not allowed' }, origin);

  let lockKey: string | null = null;
  let context: Awaited<ReturnType<typeof requireActiveAdministrator>> | null = null;
  let payload: CreateUserPayload | null = null;
  let auditId: string | null = null;
  let createdUserId: string | null = null;
  try {
    context = await requireActiveAdministrator(event);
    payload = validateCreateUserPayload(parseJsonBody(event, ['email', 'nombre_completo', 'rol_id', 'activo', 'password']));
    lockKey = `${context.actorUserId}:${payload.email}`;
    if (inFlightUserCreations.has(lockKey)) return response(429, { error: 'Try again later' }, origin);
    inFlightUserCreations.add(lockKey);

    const { data: role, error: roleError } = await context.admin
      .schema('public')
      .from('roles')
      .select('id, nombre')
      .eq('id', payload.rol_id)
      .maybeSingle();
    if (roleError) throw new Error('ROLE_LOOKUP_FAILED');
    if (!role) return response(404, { error: 'Selected role does not exist' }, origin);
    if (role.nombre === 'Administrador') return response(403, { error: 'Administrator accounts cannot be created from this tool' }, origin);

    await enforceCreateUserRateLimit(context.admin, context.actorUserId);
    auditId = await createInitialAudit(context.admin, context.actorUserId, payload.rol_id, payload.activo);

    const { data: createdAuth, error: createAuthError } = await context.admin.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true,
    });
    if (createAuthError || !createdAuth.user?.id) {
      try { await finalizeFailedAudit(context.admin, auditId, context.actorUserId, null, payload.rol_id, payload.activo, isDuplicateAuthUserError(createAuthError) ? 'EMAIL_ALREADY_EXISTS' : 'AUTH_CREATE_FAILED'); } catch { /* Initial entry stays non-successful. */ }
      if (isDuplicateAuthUserError(createAuthError)) return response(409, { error: 'Ya existe una cuenta con este correo.', code: 'email_already_exists' }, origin);
      return response(500, { error: 'Unable to create user' }, origin);
    }

    createdUserId = createdAuth.user.id;
    try {
      await markAuthCreated(context.admin, auditId, context.actorUserId, createdUserId, payload.rol_id, payload.activo);
      const { error: profileError } = await context.admin.rpc('admin_create_managed_user', {
        p_actor_user_id: context.actorUserId,
        p_audit_id: auditId,
        p_target_user_id: createdUserId,
        p_nombre_completo: payload.nombre_completo,
        p_rol_id: payload.rol_id,
        p_activo: payload.activo,
      });
      if (profileError) throw new Error('PROFILE_CREATE_FAILED');
    } catch {
      const { error: compensationError } = await context.admin.auth.admin.deleteUser(createdUserId);
      const failureCode = compensationError ? 'PROFILE_CREATE_FAILED_COMPENSATION_FAILED' : 'PROFILE_CREATE_FAILED_COMPENSATED';
      try { await finalizeFailedAudit(context.admin, auditId, context.actorUserId, createdUserId, payload.rol_id, payload.activo, failureCode); } catch { /* Do not retry an uncertain operation. */ }
      return response(500, { error: compensationError ? 'User creation could not be completed. Contact support before retrying.' : 'Unable to create user' }, origin);
    }

    return response(201, { success: true, user_id: createdUserId, rol_id: payload.rol_id, activo: payload.activo }, origin);
  } catch (error) {
    if (error instanceof HttpInputError) return response(error.statusCode, { error: error.message }, origin);
    const code = error instanceof Error ? error.message : 'UNKNOWN';
    if (code === 'UNAUTHORIZED') return response(401, { error: 'Unauthorized' }, origin);
    if (code === 'FORBIDDEN') return response(403, { error: 'Administrator access required' }, origin);
    if (code === 'RATE_LIMITED') return response(429, { error: 'Try again later' }, origin);
    if (code === 'AUDIT_INITIAL_WRITE_FAILED') return response(500, { error: 'Unable to start user creation audit' }, origin);
    console.error('admin-create-user failed');
    return response(500, { error: 'Unable to create user' }, origin);
  } finally {
    if (lockKey) inFlightUserCreations.delete(lockKey);
  }
};
