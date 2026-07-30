import type { Handler } from '@netlify/functions';
import { HttpInputError, isAllowedFunctionRequest, isUuid, parseJsonBody, requireActiveAdministrator, response, writeAudit } from './lib/admin-user-utils';

const controlledErrors: Array<[string, number, string]> = [
  ['USER_NOT_FOUND', 404, 'Authentication user not found'],
  ['ROLE_NOT_FOUND', 400, 'Selected role does not exist'],
  ['USER_PROFILE_ALREADY_EXISTS', 409, 'This account already has a profile'],
  ['INVALID_ACTIVE_VALUE', 400, 'Invalid active value'],
];

export const classifyCreateProfileError = (code: string) =>
  controlledErrors.find(([prefix]) => code.startsWith(prefix));

type CreateProfilePayload = {
  target_user_id: string;
  rol_id: string;
  activo: boolean;
};

export const validateCreateProfilePayload = (body: Record<string, unknown>): CreateProfilePayload => {
  if (!isUuid(body.target_user_id) || !isUuid(body.rol_id) || typeof body.activo !== 'boolean') {
    throw new HttpInputError(400, 'Invalid profile payload');
  }
  return { target_user_id: body.target_user_id, rol_id: body.rol_id, activo: body.activo };
};

export const handler: Handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin;
  if (!isAllowedFunctionRequest(event)) return response(403, { error: 'Origin not allowed' });
  if (event.httpMethod === 'OPTIONS') return response(204, {}, origin);
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method not allowed' }, origin);

  let context: Awaited<ReturnType<typeof requireActiveAdministrator>> | null = null;
  let targetUserId: string | null = null;
  try {
    context = await requireActiveAdministrator(event);
    const payload = validateCreateProfilePayload(parseJsonBody(event, ['target_user_id', 'rol_id', 'activo']));
    targetUserId = payload.target_user_id;

    const { data: authUser, error: authUserError } = await context.admin.auth.admin.getUserById(targetUserId);
    if (authUserError || !authUser.user) {
      await writeAudit(context.admin, { actorUserId: context.actorUserId, targetUserId, action: 'create_user_profile', success: false, errorMessage: 'USER_NOT_FOUND' });
      return response(404, { error: 'Authentication user not found' }, origin);
    }

    const { data: existingProfile, error: existingProfileError } = await context.admin
      .schema('public')
      .from('perfiles')
      .select('id')
      .eq('id', targetUserId)
      .maybeSingle();
    if (existingProfileError) throw existingProfileError;
    if (existingProfile) {
      await writeAudit(context.admin, { actorUserId: context.actorUserId, targetUserId, action: 'create_user_profile', success: false, errorMessage: 'USER_PROFILE_ALREADY_EXISTS' });
      return response(409, { error: 'This account already has a profile' }, origin);
    }

    const { data: role, error: roleError } = await context.admin
      .schema('public')
      .from('roles')
      .select('id')
      .eq('id', payload.rol_id)
      .maybeSingle();
    if (roleError) throw roleError;
    if (!role) {
      await writeAudit(context.admin, { actorUserId: context.actorUserId, targetUserId, action: 'create_user_profile', success: false, errorMessage: 'ROLE_NOT_FOUND' });
      return response(400, { error: 'Selected role does not exist' }, origin);
    }

    const { data, error } = await context.admin.rpc('admin_create_user_profile', {
      p_actor_user_id: context.actorUserId,
      p_target_user_id: targetUserId,
      p_rol_id: payload.rol_id,
      p_activo: payload.activo,
    });
    if (error) throw error;
    const result = data?.[0];
    if (!result) throw new Error('EMPTY_RPC_RESULT');
    return response(201, { success: true, rol_id: result.rol_id, activo: result.activo }, origin);
  } catch (error) {
    if (error instanceof HttpInputError) return response(error.statusCode, { error: error.message }, origin);
    const code = error instanceof Error ? error.message : 'UNKNOWN';
    const controlled = classifyCreateProfileError(code);
    if (context) await writeAudit(context.admin, { actorUserId: context.actorUserId, targetUserId, action: 'create_user_profile', success: false, errorMessage: controlled?.[0] || 'UNEXPECTED_FAILURE' });
    if (code === 'UNAUTHORIZED') return response(401, { error: 'Unauthorized' }, origin);
    if (code === 'FORBIDDEN' || code === 'ADMIN_FORBIDDEN') return response(403, { error: 'Administrator access required' }, origin);
    if (controlled) return response(controlled[1], { error: controlled[2] }, origin);
    console.error('admin-create-user-profile failed');
    return response(500, { error: 'Unable to create user profile' }, origin);
  }
};
