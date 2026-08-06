import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'netlify/functions/admin-generate-backup.ts'), 'utf8');
const uiSource = readFileSync(resolve(process.cwd(), 'src/pages/BackupCenter.tsx'), 'utf8');

const previewHost = /^deploy-preview-\d+--logistica-fernaguez-admin\.netlify\.app$/;
assert.ok(previewHost.test('deploy-preview-11--logistica-fernaguez-admin.netlify.app'));
assert.ok(previewHost.test('deploy-preview-987--logistica-fernaguez-admin.netlify.app'));
assert.ok(!previewHost.test('deploy-preview-11--logistica-fernaguez-mobile.netlify.app'));
assert.ok(!previewHost.test('deploy-preview-11--logistica-fernaguez-admin.netlify.app.evil.example'));
assert.match(source, /ADMIN_PRODUCTION_ORIGIN = 'https:\/\/admin\.appvielha\.com'/);
assert.match(source, /ADMIN_PREVIEW_HOST = \/\^deploy-preview-\\d\+--logistica-fernaguez-admin\\\.netlify\\\.app\$\//);
assert.match(source, /url\.protocol === 'https:' && url\.port === '' && ADMIN_PREVIEW_HOST\.test\(url\.hostname\)/);
assert.match(source, /url\.protocol === 'http:' && \(url\.hostname === 'localhost' \|\| url\.hostname === '127\.0\.0\.1'\)/);
assert.match(source, /deployPrimeUrl = process\.env\.DEPLOY_PRIME_URL/);
assert.doesNotMatch(source, /\*\.netlify\.app/);
assert.match(source, /event\.httpMethod !== 'POST'/);
assert.match(source, /parseJsonBody\(event, \[\]\)/);
assert.match(source, /requireActiveAdministrator\(event\)/);
assert.match(source, /action: 'generate_data_backup'/);
for (const table of [
  'aseguradoras', 'especialidades', 'ordenes', 'orden_asignaciones', 'reportes',
  'trabajadores', 'perfiles', 'roles', 'permisos', 'permisos_roles',
  'tareas_frecuentes', 'configuracion_sistema', 'contadores', 'admin_user_audit_log',
]) assert.match(source, new RegExp("'" + table + "'"));
assert.match(source, /SAFE_CONFIGURATION_KEYS/);
assert.match(source, /metodo_notificacion/);
assert.match(source, /redactConfiguration/);
assert.match(source, /SAFE_AUDIT_CHANGED_FIELDS/);
assert.match(source, /redactAuditLog/);
assert.match(source, /changedAuditFields/);
assert.match(source, /redactReportMediaReferences/);
assert.match(source, /url\.search = ''/);
assert.match(source, /url\.hash = ''/);
assert.match(source, /range\(offset, offset \+ PAGE_SIZE - 1\)/);
assert.match(source, /stableRows/);
assert.match(source, /tipo_copia: 'datos'/);
assert.match(source, /checksums\/sha256\.json/);
assert.match(source, /checksumGlobal/);
assert.match(source, /backup-datos-logistica-/);
assert.match(source, /backup_too_large/);
assert.match(source, /backupInProgress/);
const jsonBuildIndex = source.indexOf("for (const table of BACKUP_TABLES) addFile('database/'");
const manifestIndex = source.indexOf('const manifest =');
const archiveIndex = source.indexOf('const archive = await zip.generateAsync');
const auditIndex = source.indexOf('await auditBackup(context.admin, context.actorUserId, {');
const responseIndex = source.indexOf('return zipResponse(archive, filename, summary, permittedOrigin);');
assert.ok(jsonBuildIndex >= 0 && manifestIndex > jsonBuildIndex && archiveIndex > manifestIndex && auditIndex > archiveIndex && responseIndex > auditIndex);
assert.ok(source.lastIndexOf('zip.file(') < archiveIndex, 'The ZIP must not be altered after archive generation');
assert.match(source, /if \(code === 'backup_audit_failed'\) return jsonResponse\(500/);
assert.doesNotMatch(source, /new_values:\s*(archive|exported|zip)/);
assert.match(uiSource, /Esta copia contiene datos personales y debe almacenarse de forma segura/);
assert.match(uiSource, /releaseDownloadAfterStart/);
assert.match(uiSource, /URL\.revokeObjectURL\(downloadUrl\)/);
assert.doesNotMatch(source, /\bfetch\s*\(/);
assert.doesNotMatch(source, /\.storage\./);
assert.doesNotMatch(source, /cloudinary/i);
assert.doesNotMatch(source, /media\//i);
assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY/);
assert.doesNotMatch(source, /app\.appvielha\.com/);
assert.doesNotMatch(source, /old_values:\s*row\.old_values/);
assert.doesNotMatch(source, /new_values:\s*row\.new_values/);
assert.doesNotMatch(source, /DELETE\s+FROM/i);

console.log('admin generate data backup contract tests passed');
