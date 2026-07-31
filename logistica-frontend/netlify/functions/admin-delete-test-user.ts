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

type DeleteTestUserStage =
  | 'target_lookup'
  | 'profile_check'
  | 'worker_link_check'
  | 'storage_ownership_check'
  | 'audit_insert'
  | 'auth_delete'
  | 'audit_finalize';

type SafeError = { code: string; message: string };

const sanitizeError = (error: unknown): SafeError => {
  const candidate = error as { code?: unknown; message?: unknown } | null;
  const code = typeof candidate?.code === 'string' ? candidate.code.slice(0, 64) : 'unknown';
  const message = typeof candidate?.message === 'string'
    ? candidate.message.replace(/\s+/g, ' ').slice(0, 160)
    : 'unknown error';
  return { code, message };
};

const logStage = (stage: DeleteTestUserStage, outcome: 'ok' | 'failed', error?: unknown) => {
  const details = error ? sanitizeError(error) : { code: 'ok', message: 'completed' };
  console.info('admin_delete_test_user', JSON.stringify({ stage, outcome, ...details }));
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
    if (authError || !authUser) {
      logStage('target_lookup', 'failed', authError);
      return response(404, { error: 'Authentication user not found' }, origin);
    }
    logStage('target_lookup', 'ok');
    if (!authUser.email || payload.confirmation_email !== authUser.email) {
      return response(400, { error: 'Confirmation email does not match the account' }, origin);
    }

    const [{ data: profile, error: profileError }, { data: worker, error: workerError }] = await Promise.all([
      context.admin.schema('public').from('perfiles').select('id').eq('id', payload.target_user_id).maybeSingle(),
      context.admin.schema('public').from('trabajadores').select('id').eq('auth_user_id', payload.target_user_id).maybeSingle(),
    ]);
    if (profileError) {
      logStage('profile_check', 'failed', profileError);
      return response(500, { error: 'Unable to verify the user profile', code: 'profile_check_failed' }, origin);
    }
    logStage('profile_check', 'ok');
    if (workerError) {
      logStage('worker_link_check', 'failed', workerError);
      return response(500, { error: 'Unable to verify the worker link', code: 'worker_link_check_failed' }, origin);
    }
    logStage('worker_link_check', 'ok');
    if (profile) return response(409, { error: 'Accounts with a profile cannot be deleted here', code: 'profile_exists' }, origin);
    if (worker) return response(409, { error: 'Accounts linked to a worker cannot be deleted here', code: 'worker_link_exists' }, origin);

    const { data: ownsStorageObjects, error: storageError } = await context.admin.rpc('admin_test_user_owns_storage_objects', {
      p_actor_user_id: context.actorUserId,
      p_target_user_id: payload.target_user_id,
    });
    if (storageError || typeof ownsStorageObjects !== 'boolean') {
      logStage('storage_ownership_check', 'failed', storageError);
      return response(500, { error: 'Unable to verify Storage ownership', code: 'storage_check_failed' }, origin);
    }
    logStage('storage_ownership_check', 'ok');
    if (ownsStorageObjects) {
      return response(409, { error: 'Accounts with Storage objects cannot be deleted here', code: 'storage_objects_owned' }, origin);
    }

    // Auth and Postgres do not share a transaction. The pending audit row is mandatory
    // and remains unsuccessful if Auth deletion fails.
    let auditId: string;
    try {
      auditId = await auditDeletionAttempt(context.admin, {
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
    } catch (auditError) {
      logStage('audit_insert', 'failed', auditError);
      return response(500, { error: 'Unable to record the deletion request', code: 'audit_failed' }, origin);
    }
    logStage('audit_insert', 'ok');

    const { error: deleteError } = await context.admin.auth.admin.deleteUser(payload.target_user_id);
    if (deleteError) {
      logStage('auth_delete', 'failed', deleteError);
      const finalizeError = await markDeletionAudit(context.admin, auditId, false, 'AUTH_DELETE_FAILED');
      if (finalizeError) logStage('audit_finalize', 'failed', finalizeError);
      else logStage('audit_finalize', 'ok');
      return response(500, { error: 'Unable to delete the test account', code: 'auth_delete_failed' }, origin);
    }
    logStage('auth_delete', 'ok');

    const auditUpdateError = await markDeletionAudit(context.admin, auditId, true, null);
    if (auditUpdateError) {
      // The account is already deleted and cannot be restored. Return a safe error so
      // operators know to reconcile the pending audit row without exposing internals.
      logStage('audit_finalize', 'failed', auditUpdateError);
      return response(500, { error: 'Account deleted, but audit finalization requires review', code: 'audit_finalize_failed' }, origin);
    }
    logStage('audit_finalize', 'ok');
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
