import type { Handler } from '@netlify/functions';
import { allowedOrigin, HttpInputError, isUuid, parseJsonBody, requireActiveAdministrator, response, writeAudit } from './lib/admin-user-utils';

export const handler: Handler = async (event) => {
  const origin = event.headers.origin;
  if (!allowedOrigin(origin)) return response(403, { error: 'Origin not allowed' });
  if (event.httpMethod === 'OPTIONS') return response(204, {}, origin);
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method not allowed' }, origin);

  let context: Awaited<ReturnType<typeof requireActiveAdministrator>> | null = null;
  let targetUserId: string | null = null;
  try {
    context = await requireActiveAdministrator(event);
    const reject = async (statusCode: number, message: string, extra: Record<string, unknown> = {}) => {
      await writeAudit(context!.admin, { actorUserId: context!.actorUserId, targetUserId, action: 'update_user_access', success: false, errorMessage: message });
      return response(statusCode, { error: message, ...extra }, origin);
    };
    const body = parseJsonBody(event, ['target_user_id', 'rol_id', 'activo']) as { target_user_id?: unknown; rol_id?: unknown; activo?: unknown };
    if (!isUuid(body.target_user_id) || (body.rol_id !== undefined && !isUuid(body.rol_id)) || (body.activo !== undefined && typeof body.activo !== 'boolean')) {
      return reject(400, 'Invalid update payload');
    }
    if (body.rol_id === undefined && body.activo === undefined) return reject(400, 'No access change requested');
    targetUserId = body.target_user_id;

    const { data: target, error: targetError } = await context.admin
      .from('perfiles')
      .select('id')
      .eq('id', targetUserId)
      .maybeSingle();
    if (targetError || !target) return reject(404, 'User profile not found');

    if (body.rol_id !== undefined) {
      const { data: role, error: roleError } = await context.admin.from('roles').select('id').eq('id', body.rol_id).maybeSingle();
      if (roleError || !role) return reject(400, 'Selected role does not exist');
    }

    const { data: updated, error: updateError } = await context.admin.rpc('admin_update_user_access', {
      p_actor_user_id: context.actorUserId,
      p_target_user_id: targetUserId,
      p_rol_id: body.rol_id ?? null,
      p_activo: body.activo ?? null,
    });
    if (updateError || !updated?.[0]) {
      if (updateError?.message.includes('LAST_ACTIVE_ADMINISTRATOR')) return reject(409, 'The last active Administrator cannot be changed or deactivated');
      if (updateError?.message.includes('USER_NOT_FOUND') || updateError?.message.includes('USER_PROFILE_NOT_FOUND')) return reject(404, 'User profile not found');
      if (updateError?.message.includes('ROLE_NOT_FOUND')) return reject(400, 'Selected role does not exist');
      throw updateError || new Error('Unable to update user access');
    }
    return response(200, { success: true, rol_id: updated[0].rol_id, activo: updated[0].activo }, origin);
  } catch (error) {
    if (error instanceof HttpInputError) return response(error.statusCode, { error: error.message }, origin);
    const code = error instanceof Error ? error.message : 'UNKNOWN';
    if (context) await writeAudit(context.admin, { actorUserId: context.actorUserId, targetUserId, action: 'update_user_access', success: false, errorMessage: code });
    if (code === 'UNAUTHORIZED') return response(401, { error: 'Unauthorized' }, origin);
    if (code === 'FORBIDDEN') return response(403, { error: 'Administrator access required' }, origin);
    console.error('admin-update-user-access failed');
    return response(500, { error: 'Unable to update user access' }, origin);
  }
};
