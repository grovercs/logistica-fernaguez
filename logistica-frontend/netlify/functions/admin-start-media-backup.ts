import type { Handler } from '@netlify/functions';
import { randomUUID } from 'node:crypto';
import { HttpInputError, parseJsonBody, requireActiveAdministrator } from './lib/admin-user-utils';
import { allowedMediaOrigin, isAllowedMediaRequest, mediaResponse, workerInvocationSignature } from './lib/admin-media-backup-utils';

export const handler: Handler = async (event) => {
  const origin = allowedMediaOrigin(event.headers.origin || event.headers.Origin);
  if (!isAllowedMediaRequest(event)) return mediaResponse(403, { error: 'Origin not allowed' });
  if (event.httpMethod === 'OPTIONS') return mediaResponse(204, {}, origin);
  if (event.httpMethod !== 'POST') return mediaResponse(405, { error: 'Method not allowed' }, origin);
  try {
    parseJsonBody(event, []);
    const { actorUserId, admin } = await requireActiveAdministrator(event);
    const workerSecret = process.env.BACKUP_WORKER_SECRET;
    const base = process.env.URL || process.env.DEPLOY_PRIME_URL;
    if (!workerSecret || !base) throw new Error('WORKER_CONFIGURATION_FAILED');
    const jobId = randomUUID();
    const { error: jobError } = await admin.from('backup_jobs').insert({ id: jobId, tipo: 'media', destino: 'local', estado: 'pending', actor_user_id: actorUserId });
    if (jobError?.code === '23505') return mediaResponse(409, { error: 'A media backup is already in progress', code: 'media_backup_in_progress' }, origin);
    if (jobError) throw new Error('BACKUP_JOB_CREATE_FAILED');
    const { error: auditError } = await admin.from('admin_user_audit_log').insert({ actor_user_id: actorUserId, target_user_id: null, action: 'start_media_backup', old_values: null, new_values: { job_id: jobId, tipo: 'media', destino: 'local' }, success: true, error_message: null });
    if (auditError) { await admin.from('backup_jobs').delete().eq('id', jobId).eq('estado', 'pending'); throw new Error('AUDIT_FAILED'); }
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const signature = workerInvocationSignature(workerSecret, jobId, actorUserId, expiresAt);
    const start = await fetch(new URL('/.netlify/functions/admin-media-backup-background', base), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ job_id: jobId, actor_user_id: actorUserId, expires_at: expiresAt, signature }) });
    if (!start.ok && start.status !== 202) { await admin.from('backup_jobs').update({ estado: 'failed', error_code: 'worker_start_failed', error_summary: 'La tarea no pudo iniciarse.', finished_at: new Date().toISOString() }).eq('id', jobId); throw new Error('WORKER_START_FAILED'); }
    return mediaResponse(202, { job_id: jobId, estado: 'pending' }, origin);
  } catch (error) {
    const status = error instanceof HttpInputError ? error.statusCode : error instanceof Error && error.message === 'UNAUTHORIZED' ? 401 : error instanceof Error && error.message === 'FORBIDDEN' ? 403 : 500;
    return mediaResponse(status, { error: status === 500 ? 'No se pudo iniciar la copia multimedia.' : (error instanceof Error ? error.message : 'Request failed') }, origin);
  }
};