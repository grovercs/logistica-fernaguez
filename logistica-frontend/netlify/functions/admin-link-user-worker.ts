import type { Handler } from '@netlify/functions';
import { allowedOrigin, HttpInputError, isUuid, parseJsonBody, requireActiveAdministrator, response, writeAudit } from './lib/admin-user-utils';

const controlledErrors: Array<[string, number, string]> = [
  ['ADMIN_LINK_CONFIRMATION_REQUIRED', 409, 'Active assignments require confirmation'],
  ['USER_NOT_FOUND', 404, 'User not found'],
  ['WORKER_NOT_FOUND', 404, 'Worker not found'],
  ['ACCOUNT_LINK_CONFLICT', 409, 'Account is already linked to another worker'],
  ['WORKER_LINK_CONFLICT', 409, 'Worker is already linked to another account'],
];

export const handler: Handler = async (event) => {
  const origin = event.headers.origin;
  if (!allowedOrigin(origin)) return response(403, { error: 'Origin not allowed' });
  if (event.httpMethod === 'OPTIONS') return response(204, {}, origin);
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method not allowed' }, origin);

  let context: Awaited<ReturnType<typeof requireActiveAdministrator>> | null = null;
  let targetUserId: string | null = null;
  try {
    context = await requireActiveAdministrator(event);
    const body = parseJsonBody(event, ['target_user_id', 'trabajador_id', 'confirm_active_assignments']) as { target_user_id?: unknown; trabajador_id?: unknown; confirm_active_assignments?: unknown };
    if (!isUuid(body.target_user_id) || (body.trabajador_id !== null && !isUuid(body.trabajador_id)) || (body.confirm_active_assignments !== undefined && typeof body.confirm_active_assignments !== 'boolean')) {
      await writeAudit(context.admin, { actorUserId: context.actorUserId, targetUserId: null, action: 'link_user_worker', success: false, errorMessage: 'INVALID_PAYLOAD' });
      return response(400, { error: 'Invalid link payload' }, origin);
    }
    targetUserId = body.target_user_id;
    const { data, error } = await context.admin.rpc('admin_link_user_worker', {
      p_actor_user_id: context.actorUserId,
      p_target_user_id: targetUserId,
      p_trabajador_id: body.trabajador_id,
      p_confirm_active_assignments: body.confirm_active_assignments ?? false,
    });
    if (error) throw error;
    const result = data?.[0];
    if (!result) throw new Error('EMPTY_RPC_RESULT');
    return response(200, { success: true, trabajador_id: result.trabajador_id, action: result.action, active_assignments: result.active_assignments }, origin);
  } catch (error) {
    if (error instanceof HttpInputError) return response(error.statusCode, { error: error.message }, origin);
    const code = error instanceof Error ? error.message : 'UNKNOWN';
    const match = controlledErrors.find(([prefix]) => code.startsWith(prefix));
    if (context) await writeAudit(context.admin, { actorUserId: context.actorUserId, targetUserId, action: 'link_user_worker', success: false, errorMessage: match?.[0] || 'UNEXPECTED_FAILURE' });
    if (code === 'UNAUTHORIZED') return response(401, { error: 'Unauthorized' }, origin);
    if (code === 'FORBIDDEN') return response(403, { error: 'Administrator access required' }, origin);
    if (match) {
      const activeAssignments = Number(code.split(':')[1] || 0);
      return response(match[1], { error: match[2], ...(match[0] === 'ADMIN_LINK_CONFIRMATION_REQUIRED' ? { requires_confirmation: true, active_assignments: activeAssignments } : {}) }, origin);
    }
    console.error('admin-link-user-worker failed');
    return response(500, { error: 'Unable to update worker link' }, origin);
  }
};
