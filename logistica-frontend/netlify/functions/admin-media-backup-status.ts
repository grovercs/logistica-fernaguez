import type { Handler } from '@netlify/functions';
import { HttpInputError, isUuid, parseJsonBody, requireActiveAdministrator } from './lib/admin-user-utils';
import { allowedMediaOrigin, isAllowedMediaRequest, mediaResponse } from './lib/admin-media-backup-utils';

export const handler: Handler = async (event) => {
  const origin = allowedMediaOrigin(event.headers.origin || event.headers.Origin);
  if (!isAllowedMediaRequest(event)) return mediaResponse(403, { error: 'Origin not allowed' });
  if (event.httpMethod === 'OPTIONS') return mediaResponse(204, {}, origin);
  if (event.httpMethod !== 'POST') return mediaResponse(405, { error: 'Method not allowed' }, origin);
  try {
    const body = parseJsonBody(event, ['job_id']);
    if (!isUuid(body.job_id)) throw new HttpInputError(400, 'Invalid job_id');
    const { actorUserId, admin } = await requireActiveAdministrator(event);
    const { data, error } = await admin.from('backup_jobs').select('id, estado, total_items, processed_items, failed_items, total_bytes, processed_bytes, error_code, error_summary, expires_at, storage_path').eq('id', body.job_id).eq('actor_user_id', actorUserId).maybeSingle();
    if (error) throw new Error('BACKUP_JOB_LOOKUP_FAILED');
    if (!data) return mediaResponse(404, { error: 'Backup job not found' }, origin);
    const progress = data.total_items > 0 ? Math.min(100, Math.round(data.processed_items * 100 / data.total_items)) : 0;
    return mediaResponse(200, { estado: data.estado, total_items: data.total_items, processed_items: data.processed_items, failed_items: data.failed_items, total_bytes: data.total_bytes, processed_bytes: data.processed_bytes, progreso: progress, error_code: data.error_code, error_summary: data.error_summary, disponibilidad: data.estado === 'completed' && Boolean(data.storage_path) && (!data.expires_at || new Date(data.expires_at) > new Date()) }, origin);
  } catch (error) {
    const status = error instanceof HttpInputError ? error.statusCode : error instanceof Error && error.message === 'UNAUTHORIZED' ? 401 : error instanceof Error && error.message === 'FORBIDDEN' ? 403 : 500;
    return mediaResponse(status, { error: status === 500 ? 'No se pudo consultar la copia multimedia.' : (error instanceof Error ? error.message : 'Request failed') }, origin);
  }
};