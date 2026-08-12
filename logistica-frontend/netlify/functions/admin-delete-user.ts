import type { Handler } from '@netlify/functions';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  HttpInputError,
  isAllowedFunctionRequest,
  isUuid,
  parseJsonBody,
  requireActiveAdministrator,
  response,
} from './lib/admin-user-utils';

const DELETE_USER_ACTION = 'admin_delete_user';

type DeleteUserPayload = {
  target_user_id: string;
  confirmation_email: string;
};

type PreflightSummary = {
  worker_linked: boolean;
  assignments: number;
  reports: number;
  orders: number;
  storage_objects_present: boolean;
  backup_jobs: number;
  audit_entries_as_actor: number;
};

const normalizeEmail = (email: string) => email.normalize('NFKC').trim().toLocaleLowerCase('en-US');

export const validateDeleteUserPayload = (body: Record<string, unknown>): DeleteUserPayload => {
  if (!isUuid(body.target_user_id) || typeof body.confirmation_email !== 'string' || body.confirmation_email.trim().length === 0) {
    throw new HttpInputError(400, 'Invalid user deletion payload');
  }
  return { target_user_id: body.target_user_id as string, confirmation_email: body.confirmation_email };
};

const countRows = async (query: PromiseLike<{ count: number | null; error: { code?: string } | null }>): Promise<number> => {
  const { count, error } = await query;
  if (error || count === null) throw new Error('PREFLIGHT_LOOKUP_FAILED');
  return count;
};

const createDeletionAudit = async (
  admin: SupabaseClient,
  actorUserId: string,
  targetUserId: string,
  roleName: string,
  active: boolean,
  summary: PreflightSummary,
): Promise<string> => {
  const { data, error } = await admin
    .schema('public')
    .from('admin_user_audit_log')
    .insert({
      actor_user_id: actorUserId,
      target_user_id: targetUserId,
      action: DELETE_USER_ACTION,
      old_values: { target_user_id: targetUserId, role: roleName, active, preflight: summary },
      new_values: null,
      success: false,
      error_message: 'PENDING_AUTH_DELETION',
    })
    .select('id')
    .single();
  if (error || !data?.id) throw new Error('AUDIT_INITIAL_WRITE_FAILED');
  return data.id as string;
};

const finalizeDeletionAudit = async (admin: SupabaseClient, auditId: string, success: boolean, errorCode: string | null): Promise<void> => {
  const { error } = await admin
    .schema('public')
    .from('admin_user_audit_log')
    .update({ success, error_message: errorCode })
    .eq('id', auditId);
  if (error) throw new Error('AUDIT_FINALIZE_FAILED');
};

const hasOperationalDependency = (summary: PreflightSummary): boolean =>
  summary.worker_linked
  || summary.storage_objects_present
  || summary.assignments > 0
  || summary.reports > 0
  || summary.orders > 0
  || summary.backup_jobs > 0
  || summary.audit_entries_as_actor > 0;

export const handler: Handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin;
  if (!isAllowedFunctionRequest(event)) return response(403, { error: 'Origin not allowed' });
  if (event.httpMethod === 'OPTIONS') return response(204, {}, origin);
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method not allowed' }, origin);

  try {
    const context = await requireActiveAdministrator(event);
    const payload = validateDeleteUserPayload(parseJsonBody(event, ['target_user_id', 'confirmation_email']));
    if (payload.target_user_id === context.actorUserId) return response(403, { error: 'You cannot delete your own account from this tool' }, origin);

    const { data: authResult, error: authError } = await context.admin.auth.admin.getUserById(payload.target_user_id);
    const authUser = authResult.user;
    if (authError || !authUser) return response(404, { error: 'Authentication user not found' }, origin);
    if (!authUser.email || normalizeEmail(payload.confirmation_email) !== normalizeEmail(authUser.email)) {
      return response(400, { error: 'Confirmation email does not match the account' }, origin);
    }

    const { data: profile, error: profileError } = await context.admin.schema('public').from('perfiles')
      .select('id, rol_id, activo').eq('id', payload.target_user_id).maybeSingle();
    if (profileError) throw new Error('PREFLIGHT_LOOKUP_FAILED');
    if (!profile) return response(409, { error: 'This account does not have an operational profile', code: 'profile_missing' }, origin);

    const { data: role, error: roleError } = await context.admin.schema('public').from('roles')
      .select('nombre').eq('id', profile.rol_id).maybeSingle();
    if (roleError) throw new Error('PREFLIGHT_LOOKUP_FAILED');
    if (!role) return response(409, { error: 'This user cannot be deleted from this tool', code: 'role_missing' }, origin);
    if (role.nombre === 'Administrador') return response(403, { error: 'Administrator accounts cannot be deleted from this tool' }, origin);

    const { data: worker, error: workerError } = await context.admin.schema('public').from('trabajadores')
      .select('id').eq('auth_user_id', payload.target_user_id).maybeSingle();
    if (workerError) throw new Error('PREFLIGHT_LOOKUP_FAILED');

    const [reports, orders, backupJobs, auditEntriesAsActor, storageCheck] = await Promise.all([
      countRows(context.admin.schema('public').from('reportes').select('id', { count: 'exact', head: true }).eq('tecnico_id', payload.target_user_id)),
      countRows(context.admin.schema('public').from('ordenes').select('id', { count: 'exact', head: true }).eq('tecnico_id', payload.target_user_id)),
      countRows(context.admin.schema('public').from('backup_jobs').select('id', { count: 'exact', head: true }).eq('actor_user_id', payload.target_user_id)),
      countRows(context.admin.schema('public').from('admin_user_audit_log').select('id', { count: 'exact', head: true }).eq('actor_user_id', payload.target_user_id)),
      context.admin.rpc('admin_test_user_owns_storage_objects', { p_actor_user_id: context.actorUserId, p_target_user_id: payload.target_user_id }),
    ]);
    if (storageCheck.error || typeof storageCheck.data !== 'boolean') throw new Error('PREFLIGHT_LOOKUP_FAILED');
    const assignments = worker
      ? await countRows(context.admin.schema('public').from('orden_asignaciones').select('id', { count: 'exact', head: true }).eq('trabajador_id', worker.id))
      : 0;
    const summary: PreflightSummary = {
      worker_linked: Boolean(worker),
      assignments,
      reports,
      orders,
      storage_objects_present: storageCheck.data,
      backup_jobs: backupJobs,
      audit_entries_as_actor: auditEntriesAsActor,
    };
    if (hasOperationalDependency(summary)) {
      return response(409, { error: 'No se puede eliminar este usuario porque tiene actividad asociada. Desactívalo en su lugar.', code: 'activity_associated' }, origin);
    }

    let auditId: string;
    try {
      auditId = await createDeletionAudit(context.admin, context.actorUserId, payload.target_user_id, role.nombre, profile.activo === true, summary);
    } catch {
      return response(500, { error: 'Unable to record the deletion request', code: 'audit_failed' }, origin);
    }

    const { error: deleteError } = await context.admin.auth.admin.deleteUser(payload.target_user_id);
    if (deleteError) {
      try { await finalizeDeletionAudit(context.admin, auditId, false, 'AUTH_DELETE_FAILED'); } catch { /* The initial audit remains unsuccessful. */ }
      return response(500, { error: 'Unable to delete the user', code: 'auth_delete_failed' }, origin);
    }

    try {
      // auth.users deletion cascades to public.perfiles. target_user_id becomes NULL in this row,
      // but old_values retains the target UUID for later reconciliation.
      await finalizeDeletionAudit(context.admin, auditId, true, null);
    } catch {
      return response(500, { error: 'User deleted, but audit finalization requires review', code: 'audit_finalize_failed' }, origin);
    }
    return response(200, { success: true }, origin);
  } catch (error) {
    if (error instanceof HttpInputError) return response(error.statusCode, { error: error.message }, origin);
    const code = error instanceof Error ? error.message : 'UNKNOWN';
    if (code === 'UNAUTHORIZED') return response(401, { error: 'Unauthorized' }, origin);
    if (code === 'FORBIDDEN' || code === 'ADMIN_FORBIDDEN') return response(403, { error: 'Administrator access required' }, origin);
    console.error('admin-delete-user failed');
    return response(500, { error: 'Unable to delete the user', code: 'preflight_check_failed' }, origin);
  }
};
