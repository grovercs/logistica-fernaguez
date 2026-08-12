import type { Handler } from '@netlify/functions';
import { HttpInputError, isUuid, parseJsonBody, requireActiveAdministrator } from './lib/admin-user-utils';
import { allowedMediaOrigin, isAllowedMediaRequest, mediaResponse } from './lib/admin-media-backup-utils';

const activeStates = ['pending', 'preparing', 'downloading', 'compressing', 'verifying'];
const statusColumns = 'id, estado, total_items, processed_items, failed_items, total_bytes, processed_bytes, error_code, error_summary, created_at, started_at, finished_at, expires_at, storage_path';

const safeStatus = (data: any, active_job: boolean) => {
  const progress = data.total_items > 0 ? Math.min(100, Math.round(data.processed_items * 100 / data.total_items)) : 0;
  return {
    id: data.id,
    estado: data.estado,
    total_items: data.total_items,
    processed_items: data.processed_items,
    failed_items: data.failed_items,
    total_bytes: data.total_bytes,
    processed_bytes: data.processed_bytes,
    progreso: progress,
    error_code: data.error_code,
    error_summary: data.error_summary,
    created_at: data.created_at,
    started_at: data.started_at,
    finished_at: data.finished_at,
    expires_at: data.expires_at,
    active_job,
    disponibilidad: data.estado === 'completed' && Boolean(data.storage_path) && (!data.expires_at || new Date(data.expires_at) > new Date()),
  };
};

export const handler: Handler = async (event) => {
  const origin = allowedMediaOrigin(event.headers.origin || event.headers.Origin);
  if (!isAllowedMediaRequest(event)) return mediaResponse(403, { error: 'Origin not allowed' });
  if (event.httpMethod === 'OPTIONS') return mediaResponse(204, {}, origin);
  if (event.httpMethod !== 'POST') return mediaResponse(405, { error: 'Method not allowed' }, origin);
  try {
    const body = parseJsonBody(event, ['job_id']);
    if (body.job_id !== undefined && !isUuid(body.job_id)) throw new HttpInputError(400, 'Invalid job_id');
    const { actorUserId, admin } = await requireActiveAdministrator(event);
    const hasJobId = typeof body.job_id === 'string';
    const query = hasJobId
      ? admin.from('backup_jobs').select(statusColumns).eq('id', body.job_id).eq('actor_user_id', actorUserId).maybeSingle()
      : admin.from('backup_jobs').select(statusColumns).eq('actor_user_id', actorUserId).eq('tipo', 'media').in('estado', activeStates).order('created_at', { ascending: false }).limit(1).maybeSingle();
    const { data, error } = await query;
    if (error) throw new Error('BACKUP_JOB_LOOKUP_FAILED');
    if (!data) return hasJobId ? mediaResponse(404, { error: 'Backup job not found' }, origin) : mediaResponse(200, { active_job: null }, origin);
    return mediaResponse(200, safeStatus(data, !hasJobId), origin);
  } catch (error) {
    const status = error instanceof HttpInputError ? error.statusCode : error instanceof Error && error.message === 'UNAUTHORIZED' ? 401 : error instanceof Error && error.message === 'FORBIDDEN' ? 403 : 500;
    return mediaResponse(status, { error: status === 500 ? 'No se pudo consultar la copia multimedia.' : (error instanceof Error ? error.message : 'Request failed') }, origin);
  }
};
