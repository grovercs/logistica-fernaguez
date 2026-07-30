import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { HandlerEvent } from '@netlify/functions';

const allowedProductionOrigins = new Set([
  'https://admin.appvielha.com',
  'https://deploy-preview-6--logistica-fernaguez-admin.netlify.app',
]);

const allowedProductionHosts = new Set([
  'admin.appvielha.com',
  'deploy-preview-6--logistica-fernaguez-admin.netlify.app',
]);

const isDevelopmentHost = (hostname: string) => hostname === 'localhost' || hostname === '127.0.0.1';

const headerValue = (headers: HandlerEvent['headers'], name: string): string | undefined =>
  headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()];

const hostnameFromUrl = (rawUrl: string | undefined): string | undefined => {
  if (!rawUrl) return undefined;
  try {
    const url = new URL(rawUrl);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.hostname : undefined;
  } catch {
    return undefined;
  }
};

const hostnameFromHeader = (value: string | undefined): string | undefined => {
  if (!value || value.includes(',')) return undefined;
  try {
    const url = new URL(`http://${value}`);
    return url.hostname;
  } catch {
    return undefined;
  }
};

const allowedRequestHost = (hostname: string | undefined): boolean =>
  Boolean(hostname && (allowedProductionHosts.has(hostname) || isDevelopmentHost(hostname)));

export interface AdminContext {
  actorUserId: string;
  admin: SupabaseClient;
}

export const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export const allowedOrigin = (origin: string | undefined): origin is string => {
  if (!origin) return false;
  if (allowedProductionOrigins.has(origin)) return true;
  try {
    const url = new URL(origin);
    return url.protocol === 'http:' && isDevelopmentHost(url.hostname);
  } catch {
    return false;
  }
};

export const isAllowedFunctionRequest = (event: Pick<HandlerEvent, 'headers' | 'rawUrl'>): boolean => {
  const origin = headerValue(event.headers, 'origin');
  if (origin !== undefined) return allowedOrigin(origin);

  const fetchSite = headerValue(event.headers, 'sec-fetch-site')?.toLowerCase();
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') return false;

  const hostname = hostnameFromUrl(event.rawUrl)
    || hostnameFromHeader(headerValue(event.headers, 'x-forwarded-host'))
    || hostnameFromHeader(headerValue(event.headers, 'host'));
  return allowedRequestHost(hostname);
};

export const MAX_JSON_BODY_BYTES = 16 * 1024;

export class HttpInputError extends Error {
  constructor(readonly statusCode: 400 | 413 | 415, message: string) {
    super(message);
  }
}

export function parseJsonBody(event: HandlerEvent, allowedProperties: readonly string[]): Record<string, unknown> {
  const contentType = event.headers['content-type'] || event.headers['Content-Type'];
  if (!contentType || !/^application\/json(?:\s*;.*)?$/i.test(contentType)) {
    throw new HttpInputError(415, 'Content-Type must be application/json');
  }
  const rawBody = event.body || '';
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_JSON_BODY_BYTES) {
    throw new HttpInputError(413, 'Request body is too large');
  }
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    throw new HttpInputError(400, 'Invalid JSON body');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpInputError(400, 'JSON body must be an object');
  }
  const unexpectedProperties = Object.keys(body).filter((property) => !allowedProperties.includes(property));
  if (unexpectedProperties.length > 0) {
    throw new HttpInputError(400, 'Unexpected request property');
  }
  return body as Record<string, unknown>;
}

export const response = (statusCode: number, body: unknown, origin?: string) => ({
  statusCode,
  headers: {
    ...(statusCode === 204 ? {} : { 'Content-Type': 'application/json' }),
    ...(origin ? {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      Vary: 'Origin',
    } : {}),
  },
  body: statusCode === 204 ? '' : JSON.stringify(body),
});

export async function requireActiveAdministrator(event: HandlerEvent): Promise<AdminContext> {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authorization = event.headers.authorization || event.headers.Authorization;
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!url || !anonKey || !serviceRoleKey) throw new Error('SERVER_CONFIGURATION_ERROR');
  if (!token) throw new Error('UNAUTHORIZED');

  const authClient = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: { user }, error: userError } = await authClient.auth.getUser(token);
  if (userError || !user) throw new Error('UNAUTHORIZED');

  const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: profile, error: profileError } = await admin
    .from('perfiles').select('id, activo, roles(nombre)').eq('id', user.id).maybeSingle();
  const roleName = (profile?.roles as { nombre?: string } | null)?.nombre;
  if (profileError || !profile?.activo || roleName !== 'Administrador') throw new Error('FORBIDDEN');
  return { actorUserId: user.id, admin };
}

export async function writeAudit(admin: SupabaseClient, entry: {
  actorUserId: string; targetUserId: string | null; action: string;
  oldValues?: Record<string, unknown> | null; newValues?: Record<string, unknown> | null;
  success: boolean; errorMessage?: string | null;
}): Promise<void> {
  const { error } = await admin.from('admin_user_audit_log').insert({
    actor_user_id: entry.actorUserId, target_user_id: entry.targetUserId, action: entry.action,
    old_values: entry.oldValues ?? null, new_values: entry.newValues ?? null,
    success: entry.success, error_message: entry.errorMessage ?? null,
  });
  if (error) console.error('Unable to write admin user audit entry', error.message);
}
