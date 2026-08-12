import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

type Tab = 'backup' | 'restaurar' | 'compactar' | 'archivados';
type BackupSummary = { filename: string; generated_at: string; tables: Record<string, number>; total_rows: number; size_bytes: number; checksum_global: string; warnings: number };
type MediaBackupJob = { id: string; estado: 'pending' | 'preparing' | 'downloading' | 'compressing' | 'verifying' | 'completed' | 'failed' | 'expired'; total_items: number; processed_items: number; failed_items: number; total_bytes: number; processed_bytes: number; progreso: number; disponibilidad: boolean; error_code: string | null; error_summary: string | null; created_at: string | null; started_at: string | null; finished_at: string | null; expires_at: string | null };
type MediaStatusResponse = MediaBackupJob & { active_job: boolean };
type ActiveMediaStatusResponse = (MediaBackupJob & { active_job: true }) | { active_job: null };
const activeMediaStates: MediaBackupJob['estado'][] = ['pending', 'preparing', 'downloading', 'compressing', 'verifying'];
const provisionalMediaJob = (): MediaBackupJob => ({ id: '', estado: 'pending', total_items: 0, processed_items: 0, failed_items: 0, total_bytes: 0, processed_bytes: 0, progreso: 0, disponibilidad: false, error_code: null, error_summary: null, created_at: null, started_at: null, finished_at: null, expires_at: null });

const phases = ['Verificando permisos', 'Exportando datos', 'Redactando campos sensibles', 'Generando manifiesto', 'Calculando integridad', 'Preparando descarga'];
const formatBytes = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toLocaleString('es-ES', { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(bytes / 1024)).toLocaleString('es-ES')} KB`;
const decodeSummary = (value: string): BackupSummary => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(padded), (byte) => byte.charCodeAt(0)))) as BackupSummary;
};

export default function BackupCenter() {
  const [activeTab, setActiveTab] = useState<Tab>('backup');
  const [showDriveConfig, setShowDriveConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<number | null>(null);
  const [summary, setSummary] = useState<BackupSummary | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [mediaJob, setMediaJob] = useState<MediaBackupJob | null>(null);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [mediaStartInFlight, setMediaStartInFlight] = useState(false);
  const [mediaRecoveryLoading, setMediaRecoveryLoading] = useState(true);
  const mediaStartLock = useRef(false);

  const mediaRequest = async <T,>(path: string, payload: Record<string, unknown>): Promise<T> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('La sesión ha caducado. Inicia sesión de nuevo.');
    const result = await fetch(path, { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const body = await result.json().catch(() => ({})) as T & { error?: string };
    if (!result.ok) throw new Error(body.error || 'No se pudo procesar la copia multimedia.');
    return body;
  };

  const recoverActiveMediaJob = async (): Promise<MediaBackupJob | null> => {
    const status = await mediaRequest<ActiveMediaStatusResponse>('/.netlify/functions/admin-media-backup-status', {});
    return status.active_job ? status : null;
  };

  const startMediaBackup = async () => {
    if (mediaBusy || mediaStartInFlight || mediaStartLock.current || (mediaJob && activeMediaStates.includes(mediaJob.estado))) return;
    mediaStartLock.current = true;
    setMediaStartInFlight(true);
    setMediaJob(provisionalMediaJob());
    setMediaBusy(true);
    try {
      const started = await mediaRequest<{ job_id: string; estado: MediaBackupJob['estado'] }>('/.netlify/functions/admin-start-media-backup', {});
      setMediaJob({ ...provisionalMediaJob(), id: started.job_id, estado: started.estado });
    } catch (mediaError) {
      try {
        const active = await recoverActiveMediaJob();
        setMediaJob(active || { ...provisionalMediaJob(), estado: 'failed', error_summary: mediaError instanceof Error ? mediaError.message : 'No se pudo iniciar la copia multimedia.' });
      } catch {
        setMediaJob({ ...provisionalMediaJob(), estado: 'failed', error_summary: mediaError instanceof Error ? mediaError.message : 'No se pudo iniciar la copia multimedia.' });
      }
    } finally { mediaStartLock.current = false; setMediaStartInFlight(false); setMediaBusy(false); }
  };

  const downloadMediaBackup = async (jobId: string) => {
    if (mediaBusy || !jobId) return;
    setMediaBusy(true);
    try {
      const { url } = await mediaRequest<{ url: string }>('/.netlify/functions/admin-media-backup-download', { job_id: jobId });
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = ''; anchor.rel = 'noopener'; document.body.appendChild(anchor); anchor.click(); anchor.remove();
    } catch (mediaError) {
      setMediaJob((current) => current ? { ...current, estado: 'failed', error_summary: mediaError instanceof Error ? mediaError.message : 'No se pudo preparar la descarga.' } : current);
    } finally { setMediaBusy(false); }
  };

  useEffect(() => {
    if (!mediaJob?.id || ['completed', 'failed', 'expired'].includes(mediaJob.estado)) return undefined;
    let cancelled = false;
    const refresh = async () => {
      try {
        const status = await mediaRequest<MediaStatusResponse>('/.netlify/functions/admin-media-backup-status', { job_id: mediaJob.id });
        if (!cancelled) setMediaJob(status);
      } catch (mediaError) {
        if (!cancelled) setMediaJob((current) => current ? { ...current, estado: 'failed', error_summary: mediaError instanceof Error ? mediaError.message : 'No se pudo consultar el progreso.' } : current);
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 3000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [mediaJob?.id, mediaJob?.estado]);

  useEffect(() => {
    let cancelled = false;
    const recover = async () => {
      try {
        const active = await recoverActiveMediaJob();
        if (!cancelled && active) setMediaJob(active);
      } finally {
        if (!cancelled) setMediaRecoveryLoading(false);
      }
    };
    void recover();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => () => { if (downloadUrl) URL.revokeObjectURL(downloadUrl); }, [downloadUrl]);

  const generateBackup = async () => {
    if (loading) return;
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setLoading(true); setError(null); setSummary(null); setDownloadUrl(null); setPhase(0);
    const interval = window.setInterval(() => setPhase((current) => current === null ? 0 : Math.min(current + 1, phases.length - 1)), 900);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('La sesión ha caducado. Inicia sesión de nuevo.');
      const result = await fetch('/.netlify/functions/admin-generate-backup', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: '{}' });
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

  const releaseDownloadAfterStart = () => {
    if (!downloadUrl) return;
    window.setTimeout(() => { URL.revokeObjectURL(downloadUrl); setDownloadUrl((current) => current === downloadUrl ? null : current); }, 1000);
  };
  const tabs: Array<{ id: Tab; label: string; icon: string }> = [
    { id: 'backup', label: 'Protección', icon: 'shield_lock' },
    { id: 'restaurar', label: 'Rescate', icon: 'medical_services' },
    { id: 'compactar', label: 'Optimizar', icon: 'cleaning_services' },
    { id: 'archivados', label: 'Historial', icon: 'inventory_2' },
  ];

  return <div className="flex h-full flex-1 flex-col overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    {showDriveConfig && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-6 backdrop-blur-sm"><div className="w-full max-w-md space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between border-b pb-4 dark:border-slate-800"><h3 className="text-lg font-bold">Ajustes de Google Drive</h3><button type="button" onClick={() => setShowDriveConfig(false)} className="text-slate-400" aria-label="Cerrar"><span className="material-symbols-outlined">close</span></button></div><div className="space-y-4"><div><label className="text-xs font-medium text-slate-500">Google Client ID</label><input disabled placeholder="Ingrese su Client ID" className="mt-1 w-full rounded-lg border-none bg-slate-50 px-4 py-2 text-sm opacity-60 dark:bg-slate-800" /></div><div><label className="text-xs font-medium text-slate-500">URL o ID de Carpeta</label><input disabled placeholder="Pegue la URL completa..." className="mt-1 w-full rounded-lg border-none bg-slate-50 px-4 py-2 text-sm opacity-60 dark:bg-slate-800" /></div><p className="text-xs text-slate-400">Próximamente. La conexión con Drive permanece protegida hasta su implementación segura.</p><div className="grid grid-cols-2 gap-3"><button disabled className="rounded-lg bg-slate-100 py-2 text-xs font-bold text-slate-400 dark:bg-slate-800">CREAR CARPETA</button><button disabled className="rounded-lg bg-primary py-2 text-xs font-bold text-white opacity-40">GUARDAR TODO</button></div></div></div></div>}
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white backdrop-blur-md dark:border-slate-800 dark:bg-slate-900"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-8"><div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><span className="material-symbols-outlined text-xl">database</span></div><h2 className="text-lg font-black tracking-tight">Base de Datos</h2></div><span className="hidden items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400 sm:flex"><span className="size-1.5 animate-pulse rounded-full bg-emerald-500" /> SISTEMA ACTIVO</span></div></header>
    <div className="flex-1 overflow-y-auto"><div className="sticky top-0 z-40 border-b border-slate-200 bg-white backdrop-blur-md dark:border-slate-800 dark:bg-slate-900"><div className="mx-auto max-w-7xl px-4 sm:px-8"><nav className="no-scrollbar flex space-x-6 overflow-x-auto sm:space-x-8">{tabs.map((tab) => <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`flex shrink-0 items-center gap-2 border-b-2 py-4 text-xs font-black uppercase tracking-widest ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}><span className="material-symbols-outlined text-lg">{tab.icon}</span>{tab.label}</button>)}</nav></div></div>
      <div className="mx-auto w-full max-w-7xl space-y-8 p-8">
        {activeTab === 'backup' && <div className="animate-in fade-in space-y-8 duration-500"><div className="flex flex-col items-center justify-between gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:flex-row"><div><h2 className="text-2xl font-bold">Seguridad y Respaldo de Datos</h2><p className="text-sm italic text-slate-500">Blindaje operativo de activos digitales frente a cualquier amenaza.</p></div><button type="button" onClick={() => setShowDriveConfig(true)} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"><span className="material-symbols-outlined text-lg">settings</span> CONFIGURAR DRIVE</button></div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <article className="flex min-h-[340px] flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="space-y-6"><div className="flex items-start justify-between"><div className="flex size-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30"><span className="material-symbols-outlined text-3xl">cloud</span></div><span className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-1 text-[10px] font-bold text-slate-400">PENDIENTE</span></div><div><h3 className="text-lg font-bold">Respaldo en Nube</h3><p className="text-sm leading-relaxed text-slate-500">Sincroniza la estructura de la base de datos (JSON) en su cuenta de Google Drive.</p></div><p className="text-xs text-slate-400">Próximamente</p></div><button disabled className="w-full rounded-lg bg-slate-100 py-3 text-sm font-bold text-slate-300 dark:bg-slate-800">SINCRONIZAR AHORA</button></article>
            <article className="flex min-h-[340px] flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="space-y-5"><div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary"><span className="material-symbols-outlined text-3xl">database</span></div><div><h3 className="text-lg font-bold">Descarga Manual</h3><p className="text-sm leading-relaxed text-slate-500">Obtenga una copia física del sistema para almacenamiento externo offline.</p></div><div className="inline-flex items-center gap-2 text-3xl font-bold text-primary">{summary ? formatBytes(summary.size_bytes) : '—'} <span className="text-[10px] font-medium uppercase tracking-widest text-slate-400">Aprox.</span></div><p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">Esta copia contiene datos personales y debe almacenarse de forma segura.</p></div><div className="mt-4 space-y-3"><button type="button" onClick={() => void generateBackup()} disabled={loading} className="w-full rounded-lg bg-primary py-3 text-sm font-bold text-white shadow-md shadow-primary/10 disabled:opacity-60">{loading ? 'CREANDO...' : 'DESCARGAR JSON'}</button>{loading && <div className="space-y-1 text-[10px] font-bold uppercase text-primary">{phases.map((item, index) => <p key={item} className={index <= (phase ?? -1) ? '' : 'text-slate-300'}>{index <= (phase ?? -1) ? '●' : '○'} {item}</p>)}</div>}{error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}{summary && <div className="space-y-1 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-[10px] text-emerald-800"><p className="font-bold">{summary.warnings ? 'COPIA CON ADVERTENCIAS' : 'COPIA GENERADA CORRECTAMENTE'}</p><p className="break-all">Archivo: {summary.filename}</p><p>Filas: {summary.total_rows} · Tamaño: {formatBytes(summary.size_bytes)}</p><p className="break-all">Checksum: {summary.checksum_global}</p>{downloadUrl && <a href={downloadUrl} download={summary.filename} onClick={releaseDownloadAfterStart} className="mt-2 inline-flex rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">DESCARGAR COPIA ZIP</a>}</div>}</div></article>
            <article className="flex min-h-[340px] flex-col justify-between rounded-xl bg-slate-900 p-6 shadow-sm"><div className="space-y-6"><div className="flex size-12 items-center justify-center rounded-lg bg-white/10 text-white"><span className="material-symbols-outlined text-3xl">folder_zip</span></div><div><h3 className="text-lg font-bold text-white">Galería Multimedia</h3><p className="text-sm leading-relaxed text-slate-400">Archivo comprimido de todas las evidencias táctiles y fotográficas.</p></div><div className="rounded-lg border border-white/5 bg-white/10 p-4 text-center"><p className="text-[10px] font-bold uppercase text-blue-400">{mediaJob ? ({ pending: 'PREPARANDO COPIA...', preparing: 'PREPARANDO COPIA...', downloading: `${mediaJob.processed_items} / ${mediaJob.total_items} EVIDENCIAS`, compressing: 'COMPRIMIENDO', verifying: 'VERIFICANDO', completed: 'LISTO', failed: 'ERROR', expired: 'ERROR' }[mediaJob.estado]) : 'PRÓXIMAMENTE'}</p><p className="mt-2 text-3xl font-bold text-white">{mediaJob ? `${mediaJob.progreso}%` : '—'} <span className="text-[10px] font-medium uppercase tracking-widest text-slate-500">{mediaJob && mediaJob.total_items > 0 ? `${mediaJob.processed_items} / ${mediaJob.total_items} EVIDENCIAS` : 'Evidencias'}</span></p><p className="mt-3 text-[9px] font-bold uppercase text-rose-400">NO CIERRE LA VENTANA</p></div></div><div className="grid grid-cols-2 gap-3"><button disabled className="rounded-lg bg-blue-900 py-2 text-[10px] font-bold uppercase tracking-widest text-white opacity-60">☁ DRIVE</button><button type="button" onClick={() => mediaJob?.estado === 'completed' ? void downloadMediaBackup(mediaJob.id) : void startMediaBackup()} disabled={mediaBusy || mediaStartInFlight || mediaRecoveryLoading || activeMediaStates.includes(mediaJob?.estado || 'completed')} className="rounded-lg bg-white py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 opacity-50">📁 ZIP LOCAL</button></div>{mediaJob?.estado === 'failed' && <p role="alert" className="mt-3 text-[10px] text-rose-300">{mediaJob.error_summary}</p>}</article>
          </div>
          <div className="flex justify-around rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900"><div><p className="text-[10px] font-bold uppercase text-slate-400">Total Obras</p><p className="text-xl font-bold">—</p></div><div className="h-10 w-px bg-slate-100 dark:bg-slate-800" /><div><p className="text-[10px] font-bold uppercase text-slate-400">Pend. Optimización</p><p className="text-xl font-bold text-amber-500">—</p></div><div className="h-10 w-px bg-slate-100 dark:bg-slate-800" /><div><p className="text-[10px] font-bold uppercase text-slate-400">Conexión Drive</p><p className="text-xl font-bold text-slate-300">INACTIVA</p></div></div>
        </div>}
        {activeTab === 'restaurar' && <div className="animate-in slide-in-from-bottom-5 space-y-8"><div className="flex items-center gap-8 rounded-xl bg-rose-600 p-8 text-white shadow-lg"><div className="flex size-16 items-center justify-center rounded-lg bg-white/20"><span className="material-symbols-outlined text-4xl">medical_services</span></div><div><h2 className="text-2xl font-bold">Estrategia de Rescate</h2><p className="text-sm font-medium text-rose-100 opacity-80">Restauración de infraestructura en caso de incidencia operacional severa.</p></div></div><div className="grid grid-cols-1 gap-8 text-center md:grid-cols-2"><div className="space-y-4 rounded-xl border-2 border-dashed border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900"><h4 className="text-lg font-bold uppercase">Vincular Archivo Maestro</h4><p className="text-sm text-slate-500">Repone la estructura de datos administrativa (.JSON).</p><button disabled className="w-full rounded-lg bg-slate-100 py-2 text-xs font-bold text-slate-400 dark:bg-slate-800">PROTEGIDO POR ADMIN</button></div><div className="space-y-4 rounded-xl border-2 border-dashed border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900"><h4 className="text-lg font-bold uppercase">Cargar Galería ZIP</h4><p className="text-sm text-slate-500">Reconstituye el carrete multimedia global (.ZIP).</p><button disabled className="w-full rounded-lg bg-slate-100 py-2 text-xs font-bold text-slate-400 dark:bg-slate-800">PROTEGIDO POR ADMIN</button></div></div></div>}
        {activeTab === 'compactar' && <div className="animate-in slide-in-from-bottom-5 space-y-8"><div className="flex items-center gap-8 rounded-xl bg-amber-500 p-8 text-slate-950 shadow-md"><div className="flex size-16 items-center justify-center rounded-lg bg-white/20"><span className="material-symbols-outlined text-4xl">cleaning_services</span></div><div><h2 className="text-2xl font-bold">Optimización de Registros</h2><p className="text-sm font-medium text-amber-950 opacity-70">Seleccione las obras finalizadas que desea mover al historial administrativo.</p></div></div><div className="space-y-4"><div className="flex items-center justify-between"><div className="flex items-center gap-4"><h3 className="text-lg font-bold">Órdenes Finalizadas</h3><span className="rounded-lg bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">0 DISPONIBLES</span></div><div className="flex gap-3"><button disabled className="text-xs font-bold text-slate-300">SELECCIONAR TODO</button><button disabled className="rounded-lg bg-amber-500 px-6 py-2 text-xs font-bold opacity-30 grayscale">ARCHIVAR 0 SELECCIONADAS</button></div></div><div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"><table className="w-full text-left text-sm"><thead className="border-b bg-slate-50 text-slate-500 dark:bg-slate-800/50"><tr><th className="px-6 py-3"><input disabled type="checkbox" /></th><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">ID OT</th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Aseguradora</th><th className="px-4 py-3 text-right">Estado</th></tr></thead><tbody><tr><td colSpan={6} className="px-6 py-20 text-center italic text-slate-400">No hay órdenes finalizadas pendientes de optimización.</td></tr></tbody></table></div><p className="text-center text-[10px] italic text-slate-400">Optimizar registros ayuda a mantener la rapidez del sistema al mover datos operativos pesados al historial administrativo.</p></div></div>}
        {activeTab === 'archivados' && <div className="animate-in slide-in-from-bottom-5 space-y-6"><div className="flex flex-col items-center justify-between gap-4 md:flex-row"><h2 className="text-lg font-bold">Historial Maestro</h2><div className="relative w-full md:w-80"><span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400">search</span><input disabled placeholder="Buscar por ID o cliente..." className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm opacity-60 dark:border-slate-800 dark:bg-slate-900" /></div></div><div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"><table className="w-full text-left text-sm"><thead className="border-b bg-slate-50 text-slate-500 dark:bg-slate-800/50"><tr><th className="px-6 py-3">Fecha</th><th className="px-6 py-3">ID OT</th><th className="px-6 py-3">Cliente</th><th className="px-6 py-3 text-right">Información</th></tr></thead><tbody><tr><td colSpan={4} className="px-6 py-20 text-center text-slate-400">Sin registros archivados.</td></tr></tbody></table></div><div className="flex justify-end gap-2 text-[10px] font-bold"><button disabled className="flex items-center gap-1 rounded-lg border border-primary/10 bg-primary/5 px-2 py-1 text-primary opacity-40"><span className="material-symbols-outlined text-sm">visibility</span>VER DETALLE</button><button disabled className="flex items-center gap-1 rounded-lg border border-amber-100 bg-amber-50 px-2 py-1 text-amber-600 opacity-40"><span className="material-symbols-outlined text-sm">settings_backup_restore</span>RESTAURAR</button></div></div>}
      </div>
    </div>
  </div>;
}
