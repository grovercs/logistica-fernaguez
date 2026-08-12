import type { Handler } from '@netlify/functions';
import { HttpInputError, isUuid, parseJsonBody, requireActiveAdministrator } from './lib/admin-user-utils';
import { MEDIA_BUCKET, allowedMediaOrigin, isAllowedMediaRequest, mediaResponse } from './lib/admin-media-backup-utils';

export const handler: Handler = async (event) => {
  const origin = allowedMediaOrigin(event.headers.origin || event.headers.Origin);
  if (!isAllowedMediaRequest(event)) return mediaResponse(403, { error: 'Origin not allowed' });
  if (event.httpMethod === 'OPTIONS') return mediaResponse(204, {}, origin);
  if (event.httpMethod !== 'POST') return mediaResponse(405, { error: 'Method not allowed' }, origin);
  try {
    const body = parseJsonBody(event, ['job_id']);
    if (!isUuid(body.job_id)) throw new HttpInputError(400, 'Invalid job_id');
    const { actorUserId, admin } = await requireActiveAdministrator(event);
    const { data, error } = await admin.from('backup_jobs').select('estado, storage_bucket, storage_path, expires_at').eq('id', body.job_id).eq('actor_user_id', actorUserId).maybeSingle();
    if (error) throw new Error('BACKUP_JOB_LOOKUP_FAILED');
    if (!data) return mediaResponse(404, { error: 'Backup job not found' }, origin);
    const expectedPathPrefix = `media-jobs/${body.job_id}/`;
    if (data.estado !== 'completed' || data.storage_bucket !== MEDIA_BUCKET || !data.storage_path || !data.storage_path.startsWith(expectedPathPrefix) || (data.expires_at && new Date(data.expires_at) <= new Date())) return mediaResponse(409, { error: 'Backup is not available', code: 'backup_not_available' }, origin);
    const { data: signed, error: signedError } = await admin.storage.from(MEDIA_BUCKET).createSignedUrl(data.storage_path, 15 * 60);
    if (signedError || !signed?.signedUrl) throw new Error('BACKUP_SIGNED_URL_FAILED');
    return mediaResponse(200, { url: signed.signedUrl, expires_in_seconds: 900 }, origin);
  } catch (error) {
    const status = error instanceof HttpInputError ? error.statusCode : error instanceof Error && error.message === 'UNAUTHORIZED' ? 401 : error instanceof Error && error.message === 'FORBIDDEN' ? 403 : 500;
    return mediaResponse(status, { error: status === 500 ? 'No se pudo preparar la descarga.' : (error instanceof Error ? error.message : 'Request failed') }, origin);
  }
};