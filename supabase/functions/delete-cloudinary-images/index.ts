import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const MAX_BODY_BYTES = 16 * 1024;
const MAX_PUBLIC_IDS = 50;
const allowedOrigins = new Set([
  'https://admin.appvielha.com',
  // The mobile client currently invokes this Function when an Administrator
  // deletes report evidence. Keep this explicit origin until that client flow
  // is moved to a different server-side endpoint.
  'https://app.appvielha.com',
]);

interface DeleteRequest {
  public_ids: string[];
}

function isDevelopmentOrigin(origin: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

function isAllowedOrigin(origin: string | null): origin is string {
  return Boolean(origin && (allowedOrigins.has(origin) || isDevelopmentOrigin(origin)));
}

function corsHeaders(origin: string | null): HeadersInit {
  return origin && isAllowedOrigin(origin)
    ? {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'authorization, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        Vary: 'Origin',
      }
    : {};
}

function response(status: number, body: Record<string, unknown>, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function hasExpectedPayload(value: unknown): value is DeleteRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== 1 || !Array.isArray(record.public_ids)) return false;
  if (record.public_ids.length === 0 || record.public_ids.length > MAX_PUBLIC_IDS) return false;

  return record.public_ids.every((id) =>
    typeof id === 'string'
    && /^logistica\/(visitas|facturas)\/[A-Za-z0-9._/-]{1,240}$/.test(id)
    && !id.includes('..'),
  );
}

function getRequiredEnvironment(): {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  cloudName: string;
  cloudinaryApiKey: string;
  cloudinaryApiSecret: string;
} | null {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME');
  const cloudinaryApiKey = Deno.env.get('CLOUDINARY_API_KEY');
  const cloudinaryApiSecret = Deno.env.get('CLOUDINARY_API_SECRET');

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey || !cloudName || !cloudinaryApiKey || !cloudinaryApiSecret) {
    return null;
  }

  return { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey, cloudName, cloudinaryApiKey, cloudinaryApiSecret };
}

serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  if (origin && !isAllowedOrigin(origin)) {
    return response(403, { error: 'Origin not allowed', code: 'origin_not_allowed' }, null);
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== 'POST') {
    return response(405, { error: 'Method not allowed', code: 'method_not_allowed' }, origin);
  }

  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return response(415, { error: 'Content-Type must be application/json', code: 'invalid_content_type' }, origin);
  }

  const contentLength = Number(req.headers.get('content-length') || '0');
  if (contentLength > MAX_BODY_BYTES) {
    return response(413, { error: 'Request body too large', code: 'payload_too_large' }, origin);
  }

  let payload: unknown;
  try {
    const text = await req.text();
    if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
      return response(413, { error: 'Request body too large', code: 'payload_too_large' }, origin);
    }
    payload = JSON.parse(text);
  } catch {
    return response(400, { error: 'Invalid request payload', code: 'invalid_payload' }, origin);
  }

  if (!hasExpectedPayload(payload)) {
    return response(400, { error: 'Invalid request payload', code: 'invalid_payload' }, origin);
  }

  const environment = getRequiredEnvironment();
  if (!environment) {
    return response(500, { error: 'Function configuration error', code: 'configuration_error' }, origin);
  }

  const authorization = req.headers.get('authorization');
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return response(401, { error: 'Authentication required', code: 'authentication_required' }, origin);
  }

  const authClient = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) {
    return response(401, { error: 'Authentication required', code: 'authentication_required' }, origin);
  }

  const adminClient = createClient(environment.supabaseUrl, environment.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: profile, error: profileError } = await adminClient
    .from('perfiles')
    .select('rol_id, activo')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (profileError) {
    return response(500, { error: 'Unable to authorize request', code: 'authorization_check_failed' }, origin);
  }
  if (!profile?.activo || !profile.rol_id) {
    return response(403, { error: 'Administrator access required', code: 'administrator_required' }, origin);
  }

  const { data: role, error: roleError } = await adminClient
    .from('roles')
    .select('nombre')
    .eq('id', profile.rol_id)
    .maybeSingle();
  if (roleError) {
    return response(500, { error: 'Unable to authorize request', code: 'authorization_check_failed' }, origin);
  }
  if (role?.nombre !== 'Administrador') {
    return response(403, { error: 'Administrator access required', code: 'administrator_required' }, origin);
  }

  try {
    const credentials = btoa(`${environment.cloudinaryApiKey}:${environment.cloudinaryApiSecret}`);
    const cloudinaryResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(environment.cloudName)}/resources/image/upload`,
      {
        method: 'DELETE',
        headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_ids: payload.public_ids }),
      },
    );

    if (!cloudinaryResponse.ok) {
      return response(502, { error: 'Unable to delete Cloudinary resources', code: 'cloudinary_delete_failed' }, origin);
    }

    return response(200, { success: true, deleted: payload.public_ids.length }, origin);
  } catch {
    return response(502, { error: 'Unable to delete Cloudinary resources', code: 'cloudinary_delete_failed' }, origin);
  }
});
