import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { HandlerEvent } from '@netlify/functions';

const allowedProductionOrigins = new Set([
  'https://admin.appvielha.com',
  'https://deploy-preview-6--logistica-fernaguez-admin.netlify.app',
  'https://deploy-preview-7--logistica-fernaguez-admin.netlify.app',
]);

const allowedProductionHosts = new Set([
  'admin.appvielha.com',
  'deploy-preview-6--logistica-fernaguez-admin.netlify.app',
  'deploy-preview-7--logistica-fernaguez-admin.netlify.app',
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

const serverClientAuthOptions = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
};

export interface AdminContext {
  actorUserId: string;
  // This client is created with SUPABASE_SERVICE_ROLE_KEY and is server-only.
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

export interface AdminAuthorizationDependencies {
  supabaseUrlHost: string | null;
  getAuthenticatedUser: (token: string) => Promise<{ userId: string | null; errorCode: string | null }>;
  verifyServerAdminUser: (userId: string) => Promise<{ userFound: boolean; errorCode: string | null }>;
  getProfile: (userId: string) => Promise<{ profile: { id: string; rol_id: string | null; activo: boolean | null } | null; errorCode: string | null }>;
  getRoleName: (roleId: string) => Promise<{ roleName: string | null; errorCode: string | null }>;
}

const configuredSupabaseHost = (url: string | undefined): string | null => {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
};

const logAdminAuthorization = (details: {
  auth_validation: 'success' | 'failure';
  authenticated_user_id: string | null;
  profile_lookup: 'found' | 'not_found' | 'error' | null;
  profile_active: boolean | null;
  role_lookup: string | null;
  admin_check: 'allowed' | 'denied';
  supabase_url_host: string | null;
  error_code: string | null;
}) => console.info('admin_authorization', JSON.stringify(details));

export async function validateActiveAdministrator(token: string | undefined, dependencies: AdminAuthorizationDependencies): Promise<string> {
  const baseLog = {
    authenticated_user_id: null,
    profile_lookup: null,
    profile_active: null,
    role_lookup: null,
    admin_check: 'denied' as const,
    supabase_url_host: dependencies.supabaseUrlHost,
  };
  if (!token) {
    logAdminAuthorization({ ...baseLog, auth_validation: 'failure', error_code: 'MISSING_BEARER_TOKEN' });
    throw new Error('UNAUTHORIZED');
  }

  const authenticated = await dependencies.getAuthenticatedUser(token);
  if (authenticated.errorCode || !authenticated.userId) {
    logAdminAuthorization({ ...baseLog, auth_validation: 'failure', error_code: authenticated.errorCode || 'AUTH_USER_NOT_FOUND' });
    throw new Error('UNAUTHORIZED');
  }

  const userId = authenticated.userId;
  const authenticatedUserId = userId.slice(0, 8);
  const serverUser = await dependencies.verifyServerAdminUser(userId);
  if (serverUser.errorCode || !serverUser.userFound) {
    logAdminAuthorization({
      ...baseLog, auth_validation: 'success', authenticated_user_id: authenticatedUserId,
      error_code: serverUser.errorCode || 'SERVER_ADMIN_USER_NOT_FOUND',
    });
    throw new Error('SERVER_ADMIN_CLIENT_ERROR');
  }

  const profileResult = await dependencies.getProfile(userId);
  if (profileResult.errorCode) {
    logAdminAuthorization({
      ...baseLog, auth_validation: 'success', authenticated_user_id: authenticatedUserId,
      profile_lookup: 'error', error_code: profileResult.errorCode,
    });
    throw new Error('ADMIN_PROFILE_LOOKUP_ERROR');
  }
  if (!profileResult.profile) {
    logAdminAuthorization({
      ...baseLog, auth_validation: 'success', authenticated_user_id: authenticatedUserId,
      profile_lookup: 'not_found', error_code: null,
    });
    throw new Error('FORBIDDEN');
  }

  const profile = profileResult.profile;
  let roleName: string | null = null;
  if (profile.rol_id) {
    const roleResult = await dependencies.getRoleName(profile.rol_id);
    if (roleResult.errorCode) {
      logAdminAuthorization({
        ...baseLog, auth_validation: 'success', authenticated_user_id: authenticatedUserId,
        profile_lookup: 'found', profile_active: profile.activo, role_lookup: null,
        error_code: roleResult.errorCode,
      });
      throw new Error('ADMIN_ROLE_LOOKUP_ERROR');
    }
    roleName = roleResult.roleName;
  }

  const allowed = profile.activo === true && roleName === 'Administrador';
  logAdminAuthorization({
    ...baseLog, auth_validation: 'success', authenticated_user_id: authenticatedUserId,
    profile_lookup: 'found', profile_active: profile.activo, role_lookup: roleName,
    admin_check: allowed ? 'allowed' : 'denied', error_code: null,
  });
  if (!allowed) throw new Error('FORBIDDEN');
  return userId;
}

export async function requireActiveAdministrator(event: HandlerEvent): Promise<AdminContext> {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authorization = event.headers.authorization || event.headers.Authorization;
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const supabaseUrlHost = configuredSupabaseHost(url);
  if (!url || !anonKey || !serviceRoleKey || !supabaseUrlHost) {
    logAdminAuthorization({
      auth_validation: 'failure', authenticated_user_id: null, profile_lookup: null,
      profile_active: null, role_lookup: null, admin_check: 'denied',
      supabase_url_host: supabaseUrlHost, error_code: 'SERVER_CONFIGURATION_ERROR',
    });
    throw new Error('SERVER_CONFIGURATION_ERROR');
  }

  // The anonymous client only validates the bearer JWT. It never reads application tables.
  const authValidationClient = createClient(url, anonKey, serverClientAuthOptions);
  // All privileged reads and auth.admin calls use this separate server-only client.
  const serverAdminClient = createClient(url, serviceRoleKey, serverClientAuthOptions);
  const actorUserId = await validateActiveAdministrator(token, {
    supabaseUrlHost,
    getAuthenticatedUser: async (bearerToken) => {
      const { data: { user }, error } = await authValidationClient.auth.getUser(bearerToken);
      return { userId: user?.id || null, errorCode: error?.code || null };
    },
    verifyServerAdminUser: async (userId) => {
      const { data, error } = await serverAdminClient.auth.admin.getUserById(userId);
      return { userFound: Boolean(data.user), errorCode: error?.code || null };
    },
    getProfile: async (userId) => {
      const { data, error } = await serverAdminClient
        .schema('public')
        .from('perfiles')
        .select('id, rol_id, activo')
        .eq('id', userId)
        .maybeSingle();
      return { profile: data, errorCode: error?.code || null };
    },
    getRoleName: async (roleId) => {
      const { data, error } = await serverAdminClient
        .schema('public')
        .from('roles')
        .select('nombre')
        .eq('id', roleId)
        .maybeSingle();
      return { roleName: data?.nombre || null, errorCode: error?.code || null };
    },
  });
  return { actorUserId, admin: serverAdminClient };
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
