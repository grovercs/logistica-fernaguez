import { createHash } from 'node:crypto';
import JSZip from 'jszip';
import type { Handler } from '@netlify/functions';
import type { SupabaseClient } from '@supabase/supabase-js';
import { HttpInputError, parseJsonBody, requireActiveAdministrator } from './lib/admin-user-utils';

const PAGE_SIZE = 1000;
const MAX_ROWS_PER_TABLE = 100000;
const DEFAULT_MAX_ZIP_BYTES = 4 * 1024 * 1024;
const BACKUP_TABLES = [
  'aseguradoras', 'especialidades', 'ordenes', 'orden_asignaciones', 'reportes',
  'trabajadores', 'perfiles', 'roles', 'permisos', 'permisos_roles',
  'tareas_frecuentes', 'configuracion_sistema', 'contadores', 'admin_user_audit_log',
] as const;
const SAFE_CONFIGURATION_KEYS = new Set(['metodo_notificacion']);
const SAFE_AUDIT_CHANGED_FIELDS = new Set(['activo', 'rol_id', 'rol', 'rol_nombre', 'trabajador_id', 'had_profile', 'had_worker_link']);

type BackupTable = typeof BACKUP_TABLES[number];
type JsonRecord = Record<string, unknown>;
type Redaction = { table: string; field: string; reason: string };

let backupInProgress = false;

const allowedOrigin = (origin: string | undefined) => {
  if (!origin) return false;
  if (origin === 'https://admin.appvielha.com') return true;
  try {
    const url = new URL(origin);
    if (url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) return true;
    return Boolean(process.env.DEPLOY_PRIME_URL && new URL(process.env.DEPLOY_PRIME_URL).origin === origin);
  } catch { return false; }
};

const allowedRequestHost = (host: string | undefined) => {
  const hostname = host?.split(':')[0]?.toLowerCase();
  if (hostname === 'admin.appvielha.com' || hostname === 'localhost' || hostname === '127.0.0.1') return true;
  try { return Boolean(hostname && process.env.DEPLOY_PRIME_URL && new URL(process.env.DEPLOY_PRIME_URL).hostname === hostname); }
  catch { return false; }
};

const isVerifiedSameOriginRequest = (event: Parameters<Handler>[0]) => {
  const site = event.headers['sec-fetch-site']?.toLowerCase();
  if (site && site !== 'same-origin' && site !== 'none') return false;
  let rawHost: string | undefined;
  try { rawHost = event.rawUrl ? new URL(event.rawUrl).host : undefined; } catch { rawHost = undefined; }
  return allowedRequestHost(rawHost || event.headers['x-forwarded-host'] || event.headers.host);
};

const jsonResponse = (statusCode: number, body: unknown, origin?: string) => ({
  statusCode,
  headers: {
    ...(statusCode === 204 ? {} : { 'Content-Type': 'application/json' }),
    ...(origin ? {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      Vary: 'Origin',
    } : {}),
  },
  body: statusCode === 204 ? '' : JSON.stringify(body),
});

const zipResponse = (archive: Buffer, filename: string, summary: Record<string, unknown>, origin?: string) => ({
  statusCode: 200,
  isBase64Encoded: true,
  headers: {
    'Content-Type': 'application/zip',
    'Content-Disposition': 'attachment; filename="' + filename + '"',
    'Cache-Control': 'no-store, private',
    'X-Backup-Summary': Buffer.from(JSON.stringify(summary)).toString('base64url'),
    ...(origin ? {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Expose-Headers': 'X-Backup-Summary, Content-Disposition',
      Vary: 'Origin',
    } : {}),
  },
  body: archive.toString('base64'),
});

const sha256 = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');
const safeIntegerEnv = (name: string, fallback: number, maximum: number) => {
  const value = Number(process.env[name]);
  return Number.isSafeInteger(value) && value > 0 ? Math.min(value, maximum) : fallback;
};
const stableRows = (rows: JsonRecord[]) => [...rows].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
const fileTimestamp = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, '');
const errorCode = (value: unknown) => String(value || 'unknown').replace(/[^a-z0-9_:.-]/gi, '').slice(0, 80) || 'unknown';

async function exportTable(admin: SupabaseClient, table: BackupTable): Promise<JsonRecord[]> {
  const rows: JsonRecord[] = [];
  for (let offset = 0; offset < MAX_ROWS_PER_TABLE; offset += PAGE_SIZE) {
    const { data, error } = await admin.schema('public').from(table).select('*').range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error('table_export_failed:' + table);
    const page = (data || []) as JsonRecord[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return stableRows(rows);
  }
  throw new Error('table_row_limit_exceeded:' + table);
}

const redactConfiguration = (rows: JsonRecord[], redactions: Redaction[]) => rows.map((row) => {
  const key = typeof row.clave === 'string' ? row.clave : '';
  const metadata = { id: row.id ?? null, clave: key || null, descripcion: row.descripcion ?? null, actualizado_en: row.actualizado_en ?? null };
  if (SAFE_CONFIGURATION_KEYS.has(key)) return { ...metadata, valor: row.valor ?? null };
  redactions.push({ table: 'configuracion_sistema', field: 'valor', reason: 'configuration_key_not_allowlisted' });
  return { ...metadata, valor_omitido: true };
});

const changedAuditFields = (value: unknown, prefix = ''): string[] => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  const fields: string[] = [];
  for (const [key, child] of Object.entries(value as JsonRecord)) {
    const path = prefix ? prefix + '.' + key : key;
    if (SAFE_AUDIT_CHANGED_FIELDS.has(key)) fields.push(path);
    fields.push(...changedAuditFields(child, path));
  }
  return fields;
};

const redactAuditLog = (rows: JsonRecord[], redactions: Redaction[]) => rows.map((row) => {
  redactions.push({ table: 'admin_user_audit_log', field: 'old_values', reason: 'audit_values_redacted' });
  redactions.push({ table: 'admin_user_audit_log', field: 'new_values', reason: 'audit_values_redacted' });
  redactions.push({ table: 'admin_user_audit_log', field: 'error_message', reason: 'audit_error_message_redacted' });
  return {
    id: row.id ?? null, actor_user_id: row.actor_user_id ?? null, target_user_id: row.target_user_id ?? null,
    action: row.action ?? null, success: row.success === true, error_code: typeof row.error_message === 'string' ? errorCode(row.error_message) : null,
    created_at: row.created_at ?? null,
    campos_modificados: [...new Set([...changedAuditFields(row.old_values), ...changedAuditFields(row.new_values)])].sort(),
  };
});

const safeMediaReference = (value: unknown, redactions: Redaction[], field: string): string | null => {
  if (typeof value !== 'string' || !value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('unsupported_reference');
    if (url.search || url.hash) redactions.push({ table: 'reportes', field, reason: 'media_reference_query_or_fragment_removed' });
    url.search = ''; url.hash = '';
    return url.toString();
  } catch {
    redactions.push({ table: 'reportes', field, reason: 'media_reference_omitted' });
    return null;
  }
};

const redactReportMediaReferences = (rows: JsonRecord[], redactions: Redaction[]) => {
  let detected = 0;
  return {
    rows: rows.map((row) => {
      const normalizeArray = (value: unknown, field: string) => {
        if (!Array.isArray(value)) return null;
        detected += value.length;
        const normalized = value.map((item) => safeMediaReference(item, redactions, field)).filter((item): item is string => Boolean(item));
        return normalized.length ? normalized : null;
      };
      const firma = row.firma_url;
      if (typeof firma === 'string' && firma) detected += 1;
      return {
        ...row,
        fotos_urls: normalizeArray(row.fotos_urls, 'fotos_urls'),
        facturas_urls: normalizeArray(row.facturas_urls, 'facturas_urls'),
        firma_url: safeMediaReference(firma, redactions, 'firma_url'),
      };
    }),
    detected,
  };
};

async function auditBackup(admin: SupabaseClient, actorUserId: string, summary: Record<string, unknown>, success = true, failureCode: string | null = null) {
  const { error } = await admin.schema('public').from('admin_user_audit_log').insert({
    actor_user_id: actorUserId, target_user_id: null, action: 'generate_data_backup',
    old_values: null, new_values: summary, success, error_message: failureCode,
  });
  if (error) throw new Error('backup_audit_failed');
}

export const handler: Handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin;
  const permittedOrigin = origin && allowedOrigin(origin) ? origin : undefined;
  if (origin && !permittedOrigin) return jsonResponse(403, { error: 'Origin not allowed' });
  if (!origin && !isVerifiedSameOriginRequest(event)) return jsonResponse(403, { error: 'Origin not allowed' });
  if (event.httpMethod === 'OPTIONS') return permittedOrigin ? jsonResponse(204, {}, permittedOrigin) : jsonResponse(403, { error: 'Origin not allowed' });
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' }, permittedOrigin);
  if (backupInProgress) return jsonResponse(429, { error: 'A data backup is already being generated', code: 'backup_in_progress' }, permittedOrigin);

  backupInProgress = true;
  let context: Awaited<ReturnType<typeof requireActiveAdministrator>> | null = null;
  try {
    context = await requireActiveAdministrator(event);
    const body = parseJsonBody(event, []);
    if (Object.keys(body).length) throw new HttpInputError(400, 'Backup requests do not accept options');

    const generatedAt = new Date();
    const redactions: Redaction[] = [];
    const exported: Partial<Record<BackupTable, JsonRecord[]>> = {};
    for (const table of BACKUP_TABLES) exported[table] = await exportTable(context.admin, table);
    exported.configuracion_sistema = redactConfiguration(exported.configuracion_sistema || [], redactions);
    exported.admin_user_audit_log = redactAuditLog(exported.admin_user_audit_log || [], redactions);
    const reports = redactReportMediaReferences(exported.reportes || [], redactions);
    exported.reportes = reports.rows;

    const zip = new JSZip();
    const checksums: Record<string, { sha256: string; size_bytes: number }> = {};
    const addFile = (path: string, value: string) => {
      zip.file(path, value);
      checksums[path] = { sha256: sha256(value), size_bytes: Buffer.byteLength(value, 'utf8') };
    };
    for (const table of BACKUP_TABLES) addFile('database/' + table + '.json', JSON.stringify(exported[table] || [], null, 2));

    const rowsByTable = Object.fromEntries(BACKUP_TABLES.map((table) => [table, (exported[table] || []).length]));
    const dataEntries = Object.entries(checksums).sort(([a], [b]) => a.localeCompare(b));
    const checksumGlobal = sha256(dataEntries.map(([path, entry]) => path + '\n' + entry.sha256 + '\n' + entry.size_bytes + '\n').join(''));
    const dataBytes = dataEntries.reduce((total, [, entry]) => total + entry.size_bytes, 0);
    const manifest = {
      tipo_copia: 'datos', version_formato: '1.0', generado_en: generatedAt.toISOString(), generado_por: context.actorUserId,
      entorno: process.env.CONTEXT || 'unknown', proyecto_supabase: new URL(process.env.SUPABASE_URL || 'https://unknown.invalid').hostname,
      version_aplicacion: process.env.COMMIT_REF || null, tablas_exportadas: BACKUP_TABLES, filas_por_tabla: rowsByTable,
      campos_redactados: redactions, tablas_con_redaccion: [...new Set(redactions.map((item) => item.table))],
      referencias_de_medios_detectadas: reports.detected, medios_incluidos: false,
      motivo_medios_no_incluidos: 'Fase 1 exporta exclusivamente datos; los medios se incorporarán mediante un trabajo asíncrono en una fase posterior.',
      tamano_total_bytes: dataBytes, definicion_tamano_total: 'Suma sin comprimir de database/*.json; el tamaño del ZIP se informa sólo en la respuesta administrativa.',
      checksum_global: checksumGlobal,
      algoritmo_checksum_global: 'SHA-256 de la concatenación UTF-8 ordenada por ruta de ruta + salto de línea + SHA-256 + salto de línea + tamaño en bytes + salto de línea para database/*.json.',
      checksum_del_zip_final: null,
      errores_y_advertencias: redactions.length ? ['Se redactaron campos sensibles; revisa campos_redactados.'] : [],
      auditoria_redactada: 'admin_user_audit_log excluye old_values, new_values y error_message; conserva sólo identificadores, resultado, fecha y nombres allowlisted de campos modificados.',
    };
    addFile('manifest.json', JSON.stringify(manifest, null, 2));
    zip.file('checksums/sha256.json', JSON.stringify(checksums, null, 2));

    const archive = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    if (archive.length > safeIntegerEnv('BACKUP_MAX_ZIP_BYTES', DEFAULT_MAX_ZIP_BYTES, 5 * 1024 * 1024)) throw new Error('backup_too_large');

    const filename = 'backup-datos-logistica-' + fileTimestamp(generatedAt) + '.zip';
    const summary = {
      filename, generated_at: generatedAt.toISOString(), tables: rowsByTable,
      total_rows: Object.values(rowsByTable).reduce((total, count) => total + count, 0),
      size_bytes: archive.length, checksum_global: checksumGlobal, warnings: redactions.length,
    };
    await auditBackup(context.admin, context.actorUserId, {
      tablas: BACKUP_TABLES, total_filas: summary.total_rows, tamano_bytes: archive.length,
      checksum_global: checksumGlobal, advertencias: redactions.length,
    });
    return zipResponse(archive, filename, summary, permittedOrigin);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'backup_failed';
    if (context && code !== 'backup_audit_failed') {
      try { await auditBackup(context.admin, context.actorUserId, { result: 'failed' }, false, errorCode(code)); } catch { /* Preserve the controlled original error. */ }
    }
    if (error instanceof HttpInputError) return jsonResponse(error.statusCode, { error: error.message }, permittedOrigin);
    if (code === 'UNAUTHORIZED') return jsonResponse(401, { error: 'Unauthorized' }, permittedOrigin);
    if (code === 'FORBIDDEN' || code === 'ADMIN_FORBIDDEN') return jsonResponse(403, { error: 'Administrator access required' }, permittedOrigin);
    if (code === 'backup_too_large' || code.startsWith('table_row_limit_exceeded')) return jsonResponse(413, { error: 'The complete data backup exceeds this secure direct-download limit', code: 'backup_too_large' }, permittedOrigin);
    if (code === 'backup_audit_failed') return jsonResponse(500, { error: 'Unable to record the backup operation', code }, permittedOrigin);
    console.error('admin-generate-backup failed', errorCode(code));
    return jsonResponse(500, { error: 'Unable to generate the data backup', code: 'backup_failed' }, permittedOrigin);
  } finally { backupInProgress = false; }
};
