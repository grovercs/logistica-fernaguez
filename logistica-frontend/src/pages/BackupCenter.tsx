import { useEffect, useState } from 'react';
import { AlertTriangle, Archive, CheckCircle2, Download, LoaderCircle, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

type BackupSummary = {
  filename: string;
  generated_at: string;
  tables: Record<string, number>;
  total_rows: number;
  size_bytes: number;
  checksum_global: string;
  warnings: number;
};

const phases = ['Verificando permisos', 'Exportando datos', 'Redactando campos sensibles', 'Generando manifiesto', 'Calculando integridad', 'Preparando descarga'];

const formatBytes = (bytes: number) => bytes >= 1024 * 1024
  ? (bytes / (1024 * 1024)).toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' MB'
  : Math.max(1, Math.round(bytes / 1024)).toLocaleString('es-ES') + ' KB';

const decodeSummary = (value: string): BackupSummary => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(padded), (byte) => byte.charCodeAt(0)))) as BackupSummary;
};

export default function BackupCenter() {
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<number | null>(null);
  const [summary, setSummary] = useState<BackupSummary | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => { if (downloadUrl) URL.revokeObjectURL(downloadUrl); }, [downloadUrl]);

  const releaseDownloadAfterStart = () => {
    if (!downloadUrl) return;
    window.setTimeout(() => {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl((current) => current === downloadUrl ? null : current);
    }, 1000);
  };

  const generateBackup = async () => {
    if (loading) return;
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setLoading(true); setError(null); setSummary(null); setDownloadUrl(null); setPhase(0);
    const interval = window.setInterval(() => setPhase((current) => current === null ? 0 : Math.min(current + 1, phases.length - 1)), 900);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('La sesión ha caducado. Inicia sesión de nuevo.');
      const result = await fetch('/.netlify/functions/admin-generate-backup', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (!result.ok) {
        const payload = await result.json().catch(() => ({})) as { error?: string };
        throw new Error(payload.error || 'No se pudo generar la copia de datos.');
      }
      const header = result.headers.get('X-Backup-Summary');
      if (!header) throw new Error('La respuesta no incluye el resumen verificable de la copia.');
      setSummary(decodeSummary(header));
      setDownloadUrl(URL.createObjectURL(await result.blob()));
      setPhase(phases.length - 1);
    } catch (backupError) {
      setError(backupError instanceof Error ? backupError.message : 'No se pudo generar la copia de datos.');
    } finally {
      window.clearInterval(interval); setLoading(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-5 sm:p-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex gap-4">
          <div className="rounded-xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-950 dark:text-blue-300"><ShieldCheck className="h-7 w-7" /></div>
          <div><h1 className="text-2xl font-bold text-slate-900 dark:text-white">Centro de copias de seguridad</h1><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">Esta copia incluye los datos operativos y de configuración permitidos. Las fotografías, firmas y documentos se incorporarán en una fase posterior.</p></div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><Archive className="h-5 w-5 text-blue-600" /><h2 className="mt-3 font-semibold">Datos operativos</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Órdenes, intervenciones, asignaciones, trabajadores, permisos, catálogos y configuración permitida.</p></article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><ShieldCheck className="h-5 w-5 text-blue-600" /><h2 className="mt-3 font-semibold">Información redactada</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Secretos de configuración y valores personales de auditoría no se incluyen en el archivo.</p></article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><CheckCircle2 className="h-5 w-5 text-blue-600" /><h2 className="mt-3 font-semibold">Verificable</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">El ZIP incorpora manifiesto y hashes SHA-256. Guárdalo fuera del sistema de forma segura.</p></article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-bold">Generar copia</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">La descarga se genera sólo para Administradores activos. No se conserva en una URL pública ni incluye medios.</p><p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">Esta copia contiene datos personales y debe almacenarse de forma segura.</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => void generateBackup()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"><LoaderCircle className={'h-5 w-5 ' + (loading ? 'animate-spin' : 'hidden')} />Generar copia de datos</button>
          {summary && <span className="text-sm text-slate-600 dark:text-slate-300">Generada en esta sesión: {new Date(summary.generated_at).toLocaleString('es-ES')}</span>}
        </div>
        {loading && <ol className="mt-6 space-y-2 text-sm">{phases.map((item, index) => <li key={item} className={index <= (phase ?? -1) ? 'font-medium text-blue-700 dark:text-blue-300' : 'text-slate-400'}>{index <= (phase ?? -1) ? '●' : '○'} {item}</li>)}</ol>}
        {error && <div role="alert" className="mt-5 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"><AlertTriangle className="h-5 w-5 shrink-0" />{error}</div>}
        {summary && <div className={'mt-5 rounded-xl border p-5 ' + (summary.warnings ? 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30' : 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30')}>
          <h3 className="font-semibold">{summary.warnings ? 'Copia generada con advertencias' : 'Copia de datos generada correctamente'}</h3>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">Archivo</dt><dd className="break-all font-medium">{summary.filename}</dd></div><div><dt className="text-slate-500">Tamaño ZIP</dt><dd className="font-medium">{formatBytes(summary.size_bytes)}</dd></div><div><dt className="text-slate-500">Filas exportadas</dt><dd className="font-medium">{summary.total_rows}</dd></div><div><dt className="text-slate-500">Checksum global</dt><dd className="break-all font-mono text-xs">{summary.checksum_global}</dd></div></dl>
          {summary.warnings > 0 && <p className="mt-3 text-sm">El manifiesto detalla los campos redactados.</p>}
          {downloadUrl && <a href={downloadUrl} download={summary.filename} onClick={releaseDownloadAfterStart} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 font-semibold text-white dark:bg-slate-100 dark:text-slate-900"><Download className="h-5 w-5" />Descargar copia de datos</a>}
        </div>}
      </section>
      <p className="text-xs leading-5 text-slate-500">Fase 1: datos y metadatos seguros. Fase 2 incorporará medios mediante una generación asíncrona en almacenamiento privado temporal.</p>
    </main>
  );
}
