import type { Handler } from '@netlify/functions';
import {
  HttpInputError,
  isAllowedFunctionRequest,
  isUuid,
  parseJsonBody,
  requireActiveAdministrator,
  response,
} from './lib/admin-user-utils';

type DeleteTestUserPayload = {
  target_user_id: string;
  confirmation_email: string;
};

export const validateDeleteTestUserPayload = (body: Record<string, unknown>): DeleteTestUserPayload => {
  if (!isUuid(body.target_user_id) || typeof body.confirmation_email !== 'string' || body.confirmation_email.length === 0) {
    throw new HttpInputError(400, 'Invalid test user deletion payload');
  }
  return { target_user_id: body.target_user_id, confirmation_email: body.confirmation_email };
};

const auditDeletionAttempt = async (
  admin: Awaited<ReturnType<typeof requireActiveAdministrator>>['admin'],
  entry: Record<string, unknown>,
) => {
  const { data, error } = await admin
    .schema('public')
    .from('admin_user_audit_log')
    .insert(entry)
    .select('id')
    .single();
  if (error || !data?.id) throw new Error('AUDIT_WRITE_FAILED');
  return data.id as string;
};

const markDeletionAudit = async (
  admin: Awaited<ReturnType<typeof requireActiveAdministrator>>['admin'],
  auditId: string,
  success: boolean,
  errorMessage: string | null,
) => {
  const { error } = await admin
    .schema('public')
    .from('admin_user_audit_log')
    .update({ success, error_message: errorMessage })
    .eq('id', auditId);
  return error;
};

export const handler: Handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin;
  if (!isAllowedFunctionRequest(event)) return response(403, { error: 'Origin not allowed' });
  if (event.httpMethod === 'OPTIONS') return response(204, {}, origin);
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method not allowed' }, origin);

  try {
    const context = await requireActiveAdministrator(event);
    const payload = validateDeleteTestUserPayload(parseJsonBody(event, ['target_user_id', 'confirmation_email']));
    if (payload.target_user_id === context.actorUserId) {
      return response(403, { error: 'You cannot delete your own account' }, origin);
    }

    const { data: authResult, error: authError } = await context.admin.auth.admin.getUserById(payload.target_user_id);
    const authUser = authResult.user;
    if (authError || !authUser) return response(404, { error: 'Authentication user not found' }, origin);
    if (!authUser.email || payload.confirmation_email !== authUser.email) {
      return response(400, { error: 'Confirmation email does not match the account' }, origin);
    }

    const [{ data: profile, error: profileError }, { data: worker, error: workerError }, { count: storageCount, error: storageError }] = await Promise.all([
      context.admin.schema('public').from('perfiles').select('id').eq('id', payload.target_user_id).maybeSingle(),
      context.admin.schema('public').from('trabajadores').select('id').eq('auth_user_id', payload.target_user_id).maybeSingle(),
      context.admin.schema('storage').from('objects').select('id', { count: 'exact', head: true }).eq('owner_id', payload.target_user_id),
    ]);
    if (profileError || workerError || storageError) throw new Error('DEPENDENCY_LOOKUP_FAILED');
    if (profile) return response(409, { error: 'Accounts with a profile cannot be deleted here', code: 'profile_exists' }, origin);
    if (worker) return response(409, { error: 'Accounts linked to a worker cannot be deleted here', code: 'worker_link_exists' }, origin);
    if ((storageCount || 0) > 0) return response(409, { error: 'Accounts with Storage objects cannot be deleted here', code: 'storage_objects_exist' }, origin);

    // Auth and Postgres do not share a transaction. The pending audit row is mandatory
    // and remains unsuccessful if Auth deletion fails.
    const auditId = await auditDeletionAttempt(context.admin, {
      actor_user_id: context.actorUserId,
      target_user_id: payload.target_user_id,
      action: 'delete_test_auth_user',
      old_values: {
        target_user_id: payload.target_user_id,
        email: authUser.email,
        created_at: authUser.created_at ?? null,
        last_sign_in_at: authUser.last_sign_in_at ?? null,
        had_profile: false,
        had_worker_link: false,
      },
      new_values: null,
      success: false,
      error_message: 'PENDING_AUTH_DELETION',
    });

    const { error: deleteError } = await context.admin.auth.admin.deleteUser(payload.target_user_id);
    if (deleteError) {
      await markDeletionAudit(context.admin, auditId, false, 'AUTH_DELETE_FAILED');
      return response(500, { error: 'Unable to delete the test account' }, origin);
    }

    const auditUpdateError = await markDeletionAudit(context.admin, auditId, true, null);
    if (auditUpdateError) {
      // The account is already deleted and cannot be restored. Return a safe error so
      // operators know to reconcile the pending audit row without exposing internals.
      console.error('admin-delete-test-user audit finalization failed');
      return response(500, { error: 'Account deleted, but audit finalization requires review' }, origin);
    }
    return response(200, { success: true }, origin);
  } catch (error) {
    if (error instanceof HttpInputError) return response(error.statusCode, { error: error.message }, origin);
    const code = error instanceof Error ? error.message : 'UNKNOWN';
    if (code === 'UNAUTHORIZED') return response(401, { error: 'Unauthorized' }, origin);
    if (code === 'FORBIDDEN' || code === 'ADMIN_FORBIDDEN') return response(403, { error: 'Administrator access required' }, origin);
    if (code === 'AUDIT_WRITE_FAILED') return response(500, { error: 'Unable to record the deletion request' }, origin);
    console.error('admin-delete-test-user failed');
    return response(500, { error: 'Unable to delete the test account' }, origin);
  }
};
