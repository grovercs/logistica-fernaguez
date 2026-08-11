import type { BackgroundHandler } from '@netlify/functions';
import { createHash } from 'node:crypto';
import JSZip from 'jszip';
import { createClient } from '@supabase/supabase-js';
import { extensionForMime, MAX_FILE_BYTES, MAX_JOB_BYTES, MEDIA_BUCKET, SIGNATURE_BUCKET, safeErrorCode, safeErrorSummary, sanitizeSegment, validWorkerSignature, verifyMediaBytes } from './lib/admin-media-backup-utils';

type MediaReference = { order_id: string | null; id_legible: string | null; reporte_id: string; tipo: 'fotos' | 'facturas' | 'firmas'; source: string };
type ManifestFile = { order_id: string | null; id_legible: string | null; reporte_id: string; tipo: string; source_provider: string; source_reference_normalized: string; zip_path: string | null; mime: string | null; size_bytes: number | null; sha256: string | null; status: 'downloaded' | 'deduplicated' | 'failed'; error_code?: string };
const MIME_ALLOWED = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const stateOptions = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

const asStrings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : [];
const normalizeSource = (source: string) => { const url = new URL(source); url.search = ''; url.hash = ''; return url.toString(); };
const isCloudinary = (url: URL) => url.protocol === 'https:' && url.hostname === 'res.cloudinary.com' && url.pathname.startsWith(`/${process.env.CLOUDINARY_CLOUD_NAME || '__missing__'}/`);
const isSupabaseStorage = (url: URL) => url.protocol === 'https:' && url.hostname === 'tqwxvryvhwijbsixmzkq.supabase.co' && /^\/storage\/v1\/object\/(public|sign)\/fotos-reportes\/firmas\//.test(url.pathname);
const storagePath = (url: URL) => { const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign)\/fotos-reportes\/(firmas\/.+)$/); return match ? decodeURIComponent(match[1]) : null; };
const mimeFromResponse = (contentType: string | null) => contentType?.split(';')[0].trim().toLowerCase() || '';

async function downloadReference(admin: ReturnType<typeof createClient>, source: string): Promise<{ bytes: Buffer; mime: string; provider: string; normalized: string }> {
  let url: URL;
  try { url = new URL(source); } catch { throw new Error('MEDIA_REFERENCE_INVALID'); }
  if (isSupabaseStorage(url)) {
    const path = storagePath(url);
    if (!path || path.includes('..') || path.startsWith('/')) throw new Error('MEDIA_REFERENCE_INVALID');
    const { data, error } = await admin.storage.from(SIGNATURE_BUCKET).download(path);
    if (error || !data) throw new Error('MEDIA_DOWNLOAD_FAILED');
    const bytes = Buffer.from(await data.arrayBuffer());
    if (bytes.length > MAX_FILE_BYTES) throw new Error('MEDIA_SIZE_LIMIT');
    const mime = data.type || mimeFromResponse(data.type);
    if (!MIME_ALLOWED.has(mime) || !verifyMediaBytes(mime, bytes)) throw new Error('MEDIA_TYPE_INVALID');
    return { bytes, mime, provider: 'supabase_storage', normalized: `supabase-storage://fotos-reportes/${path}` };
  }
  if (!isCloudinary(url)) throw new Error('MEDIA_REFERENCE_INVALID');
  const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(20_000) });
  if (response.status >= 300 && response.status < 400) throw new Error('MEDIA_REDIRECT_REJECTED');
  if (!response.ok) throw new Error('MEDIA_DOWNLOAD_FAILED');
  const declared = Number(response.headers.get('content-length') || '0');
  if (declared > MAX_FILE_BYTES) throw new Error('MEDIA_SIZE_LIMIT');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > MAX_FILE_BYTES) throw new Error('MEDIA_SIZE_LIMIT');
  const mime = mimeFromResponse(response.headers.get('content-type'));
  if (!MIME_ALLOWED.has(mime) || !verifyMediaBytes(mime, bytes)) throw new Error('MEDIA_TYPE_INVALID');
  return { bytes, mime, provider: 'cloudinary', normalized: normalizeSource(source) };
}

export const handler: BackgroundHandler = async (event) => {
  if (event.httpMethod !== 'POST') return;
  let jobId = '';
  let admin: any = null;
  try {
    const body = JSON.parse(event.body || '{}') as { job_id?: unknown; actor_user_id?: unknown; expires_at?: unknown; signature?: unknown };
    if (typeof body.job_id !== 'string' || typeof body.actor_user_id !== 'string' || typeof body.expires_at !== 'string' || typeof body.signature !== 'string') throw new Error('BACKUP_JOB_INVALID');
    const expiry = new Date(body.expires_at);
    if (!Number.isFinite(expiry.getTime()) || expiry.getTime() <= Date.now() || expiry.getTime() > Date.now() + 6 * 60 * 1000) throw new Error('BACKUP_INVOCATION_EXPIRED');
    const url = process.env.SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY; const workerSecret = process.env.BACKUP_WORKER_SECRET;
    if (!url || !key || !workerSecret) throw new Error('BACKUP_CONFIGURATION_FAILED');
    if (!validWorkerSignature(workerSecret, body.job_id, body.actor_user_id, body.expires_at, body.signature)) throw new Error('BACKUP_INVOCATION_SIGNATURE_INVALID');
    jobId = body.job_id;
    admin = createClient(url, key, stateOptions);
    const { data: job, error: claimError } = await admin.from('backup_jobs').update({ estado: 'preparing', started_at: new Date().toISOString(), heartbeat_at: new Date().toISOString(), error_code: null, error_summary: null }).eq('id', jobId).eq('actor_user_id', body.actor_user_id).eq('estado', 'pending').select('id, actor_user_id').maybeSingle();
    if (claimError) throw new Error('BACKUP_JOB_CLAIM_FAILED');
    if (!job) return;
    const [{ data: reports, error: reportsError }, { data: orders, error: ordersError }] = await Promise.all([
      admin.from('reportes').select('id, orden_id, fotos_urls, facturas_urls, firma_url').range(0, 100000),
      admin.from('ordenes').select('id, id_legible').range(0, 100000),
    ]);
    if (reportsError || ordersError) throw new Error('BACKUP_SCHEMA_ACCESS_FAILED');
    const orderIds = new Map<string, string | null>(((orders || []) as any[]).map((row) => [String(row.id), typeof row.id_legible === 'string' ? row.id_legible : null]));
    const references: MediaReference[] = [];
    for (const row of ((reports || []) as any[])) {
      const orderId = typeof row.orden_id === 'string' ? row.orden_id : null;
      for (const source of asStrings(row.fotos_urls)) references.push({ order_id: orderId, id_legible: orderId ? orderIds.get(orderId) || null : null, reporte_id: String(row.id), tipo: 'fotos', source });
      for (const source of asStrings(row.facturas_urls)) references.push({ order_id: orderId, id_legible: orderId ? orderIds.get(orderId) || null : null, reporte_id: String(row.id), tipo: 'facturas', source });
      if (typeof row.firma_url === 'string' && row.firma_url) references.push({ order_id: orderId, id_legible: orderId ? orderIds.get(orderId) || null : null, reporte_id: String(row.id), tipo: 'firmas', source: row.firma_url });
    }
    await admin.from('backup_jobs').update({ estado: 'downloading', total_items: references.length, heartbeat_at: new Date().toISOString() }).eq('id', jobId);
    const zip = new JSZip(); const manifest: ManifestFile[] = []; const known = new Map<string, string>();
    let processedBytes = 0; let failed = 0;
    for (let index = 0; index < references.length; index += 1) {
      const ref = references[index];
      try {
        const file = await downloadReference(admin, ref.source);
        if (processedBytes + file.bytes.length > MAX_JOB_BYTES) throw new Error('MEDIA_SIZE_LIMIT');
        const sha = createHash('sha256').update(file.bytes).digest('hex');
        const existing = known.get(sha);
        const folder = ref.id_legible ? sanitizeSegment(ref.id_legible, 'sin_obra') : 'sin_obra';
        const path = existing || `media/${folder}/${ref.tipo}/${sanitizeSegment(ref.reporte_id, 'reporte')}-${ref.tipo}-${index + 1}.${extensionForMime(file.mime)}`;
        if (!existing) { zip.file(path, file.bytes); known.set(sha, path); processedBytes += file.bytes.length; }
        manifest.push({ order_id: ref.order_id, id_legible: ref.id_legible, reporte_id: ref.reporte_id, tipo: ref.tipo, source_provider: file.provider, source_reference_normalized: file.normalized, zip_path: path, mime: file.mime, size_bytes: file.bytes.length, sha256: sha, status: existing ? 'deduplicated' : 'downloaded' });
      } catch (error) {
        failed += 1; const code = safeErrorCode(error, 'media_download_failed');
        manifest.push({ order_id: ref.order_id, id_legible: ref.id_legible, reporte_id: ref.reporte_id, tipo: ref.tipo, source_provider: 'unknown', source_reference_normalized: 'redacted_invalid_reference', zip_path: null, mime: null, size_bytes: null, sha256: null, status: 'failed', error_code: code });
      }
      await admin.from('backup_jobs').update({ processed_items: index + 1, processed_bytes: processedBytes, failed_items: failed, heartbeat_at: new Date().toISOString() }).eq('id', jobId);
    }
    const allowedFailures = Math.min(10, Math.max(1, Math.ceil(references.length * 0.05)));
    if (failed > allowedFailures) throw new Error('MEDIA_FAILURE_THRESHOLD_EXCEEDED');
    await admin.from('backup_jobs').update({ estado: 'compressing', heartbeat_at: new Date().toISOString() }).eq('id', jobId);
    const generatedAt = new Date().toISOString();
    const fileChecksums = manifest.filter((item) => item.status !== 'failed').map((item) => ({ zip_path: item.zip_path, sha256: item.sha256 })).filter((item, index, all) => all.findIndex((candidate) => candidate.zip_path === item.zip_path) === index);
    const checksumGlobal = createHash('sha256').update(JSON.stringify(fileChecksums)).digest('hex');
    const document = { version_formato: 1, generado_en: generatedAt, medios_incluidos: true, resumen: { total_referencias: references.length, descargadas: manifest.filter((item) => item.status === 'downloaded').length, omitidas: manifest.filter((item) => item.status === 'deduplicated').length, fallidas: failed, bytes: processedBytes, checksum_global: checksumGlobal }, archivos: manifest };
    zip.file('manifest.json', JSON.stringify(document, null, 2));
    zip.file('checksums/sha256.json', JSON.stringify({ checksum_global: checksumGlobal, files: fileChecksums }, null, 2));
    await admin.from('backup_jobs').update({ estado: 'verifying', heartbeat_at: new Date().toISOString() }).eq('id', jobId);
    const archive = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    if (!archive.length) throw new Error('BACKUP_ZIP_INVALID');
    const timestamp = generatedAt.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const storagePath = `media-jobs/${jobId}/backup-medios-logistica-${timestamp}.zip`;
    const { error: uploadError } = await admin.storage.from(MEDIA_BUCKET).upload(storagePath, archive, { contentType: 'application/zip', upsert: false });
    if (uploadError) throw new Error('STORAGE_UPLOAD_FAILED');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { error: completeError } = await admin.from('backup_jobs').update({ estado: 'completed', processed_bytes: processedBytes, failed_items: failed, checksum_final: createHash('sha256').update(archive).digest('hex'), storage_bucket: MEDIA_BUCKET, storage_path: storagePath, expires_at: expiresAt, finished_at: new Date().toISOString(), heartbeat_at: new Date().toISOString() }).eq('id', jobId);
    if (completeError) { await admin.storage.from(MEDIA_BUCKET).remove([storagePath]); throw new Error('BACKUP_JOB_COMPLETE_FAILED'); }
    const { error: auditError } = await admin.from('admin_user_audit_log').insert({ actor_user_id: job.actor_user_id, target_user_id: null, action: 'complete_media_backup', old_values: null, new_values: { job_id: jobId, total_items: references.length, failed_items: failed, checksum_final: checksumGlobal }, success: true, error_message: null });
    if (auditError) { await admin.storage.from(MEDIA_BUCKET).remove([storagePath]); await admin.from('backup_jobs').update({ estado: 'failed', storage_path: null, storage_bucket: null, error_code: 'audit_failed', error_summary: safeErrorSummary('audit_failed'), finished_at: new Date().toISOString() }).eq('id', jobId); }
  } catch (error) {
    const code = safeErrorCode(error); if (admin && jobId) await admin.from('backup_jobs').update({ estado: 'failed', error_code: code, error_summary: safeErrorSummary(code), storage_bucket: null, storage_path: null, finished_at: new Date().toISOString(), heartbeat_at: new Date().toISOString() }).eq('id', jobId);
  }
  return;
};