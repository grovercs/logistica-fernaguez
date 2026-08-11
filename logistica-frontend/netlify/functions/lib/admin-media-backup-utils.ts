import { createHmac, timingSafeEqual } from 'node:crypto';
import type { HandlerEvent } from '@netlify/functions';

export const MEDIA_BUCKET = 'backup-artifacts-private';
export const SIGNATURE_BUCKET = 'fotos-reportes';
export const SIGNATURE_PREFIX = 'firmas/';
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_JOB_BYTES = 150 * 1024 * 1024;
export const MEDIA_JOB_STATES = ['pending', 'preparing', 'downloading', 'compressing', 'verifying', 'completed', 'failed', 'expired'] as const;

const previewHost = /^deploy-preview-\d+--logistica-fernaguez-admin\.netlify\.app$/;
const devHost = (host: string) => host === 'localhost' || host === '127.0.0.1';
const header = (event: Pick<HandlerEvent, 'headers'>, name: string) => event.headers[name] || event.headers[name.toLowerCase()] || event.headers[name.toUpperCase()];

export function allowedMediaOrigin(origin: string | undefined): string | undefined {
  if (!origin) return undefined;
  try {
    const url = new URL(origin);
    if (url.origin === 'https://admin.appvielha.com') return url.origin;
    if (url.protocol === 'https:' && previewHost.test(url.hostname)) return url.origin;
    if (url.protocol === 'http:' && devHost(url.hostname)) return url.origin;
  } catch { /* rejected */ }
  return undefined;
}

export function isAllowedMediaRequest(event: Pick<HandlerEvent, 'headers' | 'rawUrl'>): boolean {
  const origin = header(event, 'origin');
  if (origin !== undefined) return Boolean(allowedMediaOrigin(origin));
  const site = header(event, 'sec-fetch-site')?.toLowerCase();
  if (site && site !== 'same-origin' && site !== 'none') return false;
  const raw = event.rawUrl || `https://${header(event, 'x-forwarded-host') || header(event, 'host') || ''}`;
  try {
    const url = new URL(raw);
    return url.hostname === 'admin.appvielha.com' || previewHost.test(url.hostname) || (url.protocol === 'http:' && devHost(url.hostname));
  } catch { return false; }
}

export function mediaResponse(statusCode: number, body: unknown, origin?: string) {
  return { statusCode, headers: { 'Content-Type': 'application/json', ...(origin ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' } : {}) }, body: JSON.stringify(body) };
}

export const workerInvocationCanonical = (jobId: string, actorUserId: string, expiresAt: string) => `${jobId}\n${actorUserId}\n${expiresAt}`;
export const workerInvocationSignature = (secret: string, jobId: string, actorUserId: string, expiresAt: string) => createHmac('sha256', secret).update(workerInvocationCanonical(jobId, actorUserId, expiresAt), 'utf8').digest('hex');
export const validWorkerSignature = (secret: string | undefined, jobId: string, actorUserId: string, expiresAt: string, signature: string) => {
  if (!secret || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = Buffer.from(workerInvocationSignature(secret, jobId, actorUserId, expiresAt), 'hex');
  const received = Buffer.from(signature, 'hex');
  return expected.length === received.length && timingSafeEqual(expected, received);
};

export const safeErrorCode = (error: unknown, fallback = 'backup_failed') => {
  const message = error instanceof Error ? error.message : '';
  return /^[A-Z_]{3,80}$/.test(message) ? message.toLowerCase() : fallback;
};
export const safeErrorSummary = (code: string) => ({ media_reference_invalid: 'Una referencia multimedia no es válida.', media_download_failed: 'No se pudo descargar una evidencia permitida.', media_size_limit: 'La copia supera el límite de tamaño permitido.', media_type_invalid: 'Una evidencia no tiene un tipo de archivo permitido.', media_redirect_rejected: 'Una evidencia intentó redirigir a un destino no permitido.', storage_upload_failed: 'No se pudo guardar el archivo de copia de forma privada.', audit_failed: 'No se pudo registrar la auditoría de la copia.' }[code] || 'No se pudo completar la copia multimedia.');
export const sanitizeSegment = (value: string | null | undefined, fallback: string) => (value || fallback).normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^[_./]+|[_./]+$/g, '').slice(0, 100) || fallback;
export function verifyMediaBytes(mime: string, bytes: Buffer): boolean {
  const normalized = mime.split(';')[0].trim().toLowerCase();
  if (normalized === 'application/pdf') return bytes.subarray(0, 5).toString('ascii') === '%PDF-';
  if (normalized === 'image/jpeg') return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (normalized === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (normalized === 'image/webp') return bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  return false;
}
export const extensionForMime = (mime: string) => ({ 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[mime.split(';')[0].trim().toLowerCase()] || 'bin');