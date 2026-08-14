import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

type Tab = 'backup' | 'restaurar' | 'compactar' | 'archivados';
type BackupSummary = { filename: string; generated_at: string; tables: Record<string, number>; total_rows: number; size_bytes: number; checksum_global: string; warnings: number };
type MediaBackupJob = { id: string; estado: 'pending' | 'preparing' | 'downloading' | 'compressing' | 'verifying' | 'completed' | 'failed' | 'expired'; total_items: number; processed_items: number; failed_items: number; total_bytes: number; processed_bytes: number; progreso: number; disponibilidad: boolean; error_code: string | null; error_summary: string | null; created_at: string | null; started_at: string | null; finished_at: string | null; expires_at: string | null };
type MediaStatusResponse = MediaBackupJob & { active_job: boolean };
type ActiveMediaStatusResponse = (MediaBackupJob & { active_job: true }) | { active_job: null };
type ArchiveOrder = { id: string; id_legible: string | null; cliente: string | null; aseguradora: string | null; estado: string; estado_previo: string | null; fecha_cierre: string | null; creado_en: string | null };
type HistoricalReport = { id: string; fecha_trabajo: string | null; horas_trabajadas: number | null; notas: string | null; trabajo_realizado: string | null; material_utilizado: string | null; fotos_urls: string[] | null; creado_en: string | null; tecnico_id: string | null; tecnico_nombre: string | null };
type HistoricalOrderDetail = ArchiveOrder & { direccion: string | null; reportes: HistoricalReport[] };
type TrabajadorDirectoryRow = { trabajador_id: string; auth_user_id: string | null; nombre: string; apellidos: string };
type HistoricalDetailStage = 'order' | 'reports' | 'directory' | 'client' | 'transform';
type HistoricalDetailError = { code?: string | null; message?: string | null; details?: string | null; hint?: string | null };
const activeMediaStates: MediaBackupJob['estado'][] = ['pending', 'preparing', 'downloading', 'compressing', 'verifying'];
const provisionalMediaJob = (): MediaBackupJob => ({ id: '', estado: 'pending', total_items: 0, processed_items: 0, failed_items: 0, total_bytes: 0, processed_bytes: 0, progreso: 0, disponibilidad: false, error_code: null, error_summary: null, created_at: null, started_at: null, finished_at: null, expires_at: null });
const logHistoricalDetailError = (stage: HistoricalDetailStage, error: unknown) => {
  const safeError = (error && typeof error === 'object' ? error : {}) as HistoricalDetailError;
  console.error('historical_order_detail_failed', {
    stage,
    code: safeError.code || null,
    message: safeError.message || null,
    details: safeError.details || null,
    hint: safeError.hint || null,
  });
};

const phases = ['Verificando permisos', 'Exportando datos', 'Redactando campos sensibles', 'Generando manifiesto', 'Calculando integridad', 'Preparando descarga'];
const formatBytes = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toLocaleString('es-ES', { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(bytes / 1024)).toLocaleString('es-ES')} KB`;
const formatWorkDate = (value: string | null) => {
  if (!value) return 'Fecha no registrada';
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
};
const formatWorkHours = (value: number | null) => `${Number(value || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })} h`;
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
  const [finalizedOrders, setFinalizedOrders] = useState<ArchiveOrder[]>([]);
  const [archivedOrders, setArchivedOrders] = useState<ArchiveOrder[]>([]);
  const [selectedArchiveIds, setSelectedArchiveIds] = useState<Set<string>>(new Set());
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [restoringOrderId, setRestoringOrderId] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [selectedHistoricalOrder, setSelectedHistoricalOrder] = useState<HistoricalOrderDetail | null>(null);
  const [historicalDetailLoading, setHistoricalDetailLoading] = useState(false);

  const [mediaJob, setMediaJob] = useState<MediaBackupJob | null>(null);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [mediaStartInFlight, setMediaStartInFlight] = useState(false);
  const [mediaRecoveryLoading, setMediaRecoveryLoading] = useState(true);
  const mediaStartLock = useRef(false);
  const mediaDownloadLock = useRef(false);

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
    if (mediaBusy || mediaDownloadLock.current || !jobId) return;
    mediaDownloadLock.current = true;
    setMediaBusy(true);
    try {
      const { url } = await mediaRequest<{ url: string }>('/.netlify/functions/admin-media-backup-download', { job_id: jobId });
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = ''; anchor.rel = 'noopener'; document.body.appendChild(anchor); anchor.click(); anchor.remove();
    } catch {
      // El job terminado se conserva para que el usuario pueda reintentar la descarga manual.
    } finally { mediaDownloadLock.current = false; setMediaBusy(false); }
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

  const loadArchiveData = async () => {
    setArchiveLoading(true);
    setArchiveError(null);
    try {
      const [finalizedResult, archivedResult] = await Promise.all([
        supabase.from('ordenes').select('id, id_legible, cliente, aseguradora, estado, fecha_cierre, creado_en, estado_previo').in('estado', ['Finalizada', 'Finalizado']).order('fecha_cierre', { ascending: false, nullsFirst: false }).order('creado_en', { ascending: false }),
        supabase.from('ordenes').select('id, id_legible, cliente, aseguradora, estado, fecha_cierre, creado_en, estado_previo').eq('estado', 'Archivado').order('fecha_cierre', { ascending: false, nullsFirst: false }).order('creado_en', { ascending: false }),
      ]);
      if (finalizedResult.error) throw finalizedResult.error;
      if (archivedResult.error) throw archivedResult.error;
      setFinalizedOrders((finalizedResult.data || []) as ArchiveOrder[]);
      setArchivedOrders((archivedResult.data || []) as ArchiveOrder[]);
      setSelectedArchiveIds((current) => new Set([...current].filter((id) => (finalizedResult.data || []).some((order) => order.id === id))));
    } catch {
      setArchiveError('No se pudieron cargar las órdenes para optimización. Inténtalo de nuevo.');
    } finally {
      setArchiveLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'compactar' || activeTab === 'archivados') void loadArchiveData();
  }, [activeTab]);

  const toggleArchiveOrder = (orderId: string) => {
    if (archiveBusy) return;
    setSelectedArchiveIds((current) => {
      const next = new Set(current);
      if (next.has(orderId)) next.delete(orderId); else next.add(orderId);
      return next;
    });
  };

  const toggleAllArchiveOrders = () => {
    if (archiveBusy) return;
    setSelectedArchiveIds((current) => current.size === finalizedOrders.length ? new Set() : new Set(finalizedOrders.map((order) => order.id)));
  };

  const archiveSelectedOrders = async () => {
    const orderIds = [...selectedArchiveIds];
    if (orderIds.length === 0 || archiveBusy) return;
    if (!window.confirm(`¿Confirmar archivado de ${orderIds.length} obras seleccionadas?`)) return;
    setArchiveBusy(true);
    setArchiveError(null);
    try {
      const { error: rpcError } = await supabase.rpc('admin_archive_orders', { p_order_ids: orderIds });
      if (rpcError) throw rpcError;
      setSelectedArchiveIds(new Set());
      await loadArchiveData();
    } catch {
      setArchiveError('No se pudieron archivar las órdenes. El lote no se ha aplicado parcialmente.');
    } finally {
      setArchiveBusy(false);
    }
  };

  const restoreArchivedOrder = async (orderId: string) => {
    if (restoringOrderId || archiveBusy) return;
    if (!window.confirm('¿Desea restaurar esta obra al sistema activo? Volverá a aparecer en el Calendario y Listado de Órdenes.')) return;
    setRestoringOrderId(orderId);
    setArchiveError(null);
    try {
      const { error: restoreError } = await supabase.rpc('admin_restore_order', { p_order_id: orderId });
      if (restoreError) throw restoreError;
      setSelectedHistoricalOrder(null);
      await loadArchiveData();
    } catch {
      setArchiveError('No se pudo restaurar la orden. Inténtalo de nuevo.');
    } finally {
      setRestoringOrderId(null);
    }
  };

  const orderDate = (order: ArchiveOrder) => (order.fecha_cierre || order.creado_en || '').slice(0, 10);

  const loadHistoricalOrderDetail = async (orderId: string) => {
    setHistoricalDetailLoading(true);
    setArchiveError(null);
    try {
      const { data: order, error: orderError } = await supabase
        .from('ordenes')
        .select('id, id_legible, cliente, aseguradora, poliza, estado, estado_previo, fecha_cierre, creado_en, direccion')
        .eq('id', orderId)
        .maybeSingle();
      if (orderError || !order || order.estado !== 'Archivado') {
        logHistoricalDetailError('order', orderError || { code: 'ORDER_NOT_ARCHIVED', message: 'Archived order was not found' });
        setArchiveError('No se pudieron cargar los detalles de la obra archivada. Inténtalo de nuevo.');
        return;
      }

      const reportsByOrderId = await supabase
        .from('reportes')
        .select('id, orden_id, tecnico_id, fecha_trabajo, horas_trabajadas, notas, trabajo_realizado, material_utilizado, fotos_urls, creado_en')
        .eq('orden_id', order.id);
      if (reportsByOrderId.error) {
        logHistoricalDetailError('reports', reportsByOrderId.error);
        setArchiveError('No se pudieron cargar las intervenciones de la obra archivada. Inténtalo de nuevo.');
      }
      const reports = reportsByOrderId.data || [];

      const technicianNames = new Map<string, string>();
      if (reports.length) {
        const { data: directoryRows, error: directoryError } = await supabase.rpc('get_trabajadores_directory');
        if (directoryError) logHistoricalDetailError('directory', directoryError);
        else (directoryRows as TrabajadorDirectoryRow[] || []).forEach((worker) => {
          const workerName = `${worker.nombre || ''} ${worker.apellidos || ''}`.trim() || 'Técnico Externo';
          technicianNames.set(worker.trabajador_id, workerName);
          if (worker.auth_user_id) technicianNames.set(worker.auth_user_id, workerName);
        });
      }

      let resolvedAddress = order.direccion?.trim() || null;
      if (!resolvedAddress && order.cliente?.trim()) {
        const { data: customer, error: customerError } = await supabase
          .from('aseguradoras')
          .select('direccion')
          .eq('nombre', order.cliente)
          .limit(1)
          .maybeSingle();
        if (customerError) logHistoricalDetailError('client', customerError);
        else resolvedAddress = customer?.direccion?.trim() || null;
      }

      try {
        const historicalReports = reports
          .map((report) => ({ ...report, tecnico_nombre: report.tecnico_id ? technicianNames.get(report.tecnico_id) || 'Técnico Externo' : 'Técnico Externo' }))
          .sort((left, right) => ((left.fecha_trabajo || '').localeCompare(right.fecha_trabajo || '') || (left.creado_en || '').localeCompare(right.creado_en || '')));
        setSelectedHistoricalOrder({ ...order, direccion: resolvedAddress, reportes: historicalReports });
      } catch (transformError) {
        logHistoricalDetailError('transform', transformError);
        setSelectedHistoricalOrder({ ...order, direccion: resolvedAddress, reportes: [] });
      }
    } catch (unexpectedError) {
      logHistoricalDetailError('order', unexpectedError);
      setArchiveError('No se pudieron cargar los detalles de la obra archivada. Inténtalo de nuevo.');
    } finally {
      setHistoricalDetailLoading(false);
    }
  };

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
  const mediaStatusTitle: Record<MediaBackupJob['estado'], string> = {
    pending: 'PREPARANDO COPIA...', preparing: 'PREPARANDO COPIA...', downloading: 'RECOPILANDO EVIDENCIAS', compressing: 'GENERANDO ZIP', verifying: 'PREPARANDO ARCHIVO FINAL', completed: 'COPIA MULTIMEDIA LISTA', failed: 'ERROR', expired: 'ERROR',
  };
  const mediaProgressRows = (job: MediaBackupJob) => {
    const step = activeMediaStates.indexOf(job.estado);
    const completed = job.estado === 'completed';
    const row = (index: number, label: string) => <p key={label} className={completed || index <= step ? '' : 'text-slate-300'}>{completed || index <= step ? '●' : '○'} {label}</p>;
    return <div className="space-y-1 text-[10px] font-bold uppercase text-primary">
      {row(0, 'Preparando copia')}
      {row(1, 'Evidencias localizadas')}
      {row(2, `${job.processed_items} / ${job.total_items} evidencias copiadas`)}
      {row(3, 'Generando ZIP')}
      {row(4, 'Preparando archivo final')}
      {row(5, 'Copia multimedia lista')}
    </div>;
  };
  const historyContent = <div className="animate-in slide-in-from-bottom-5 space-y-6">
    <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
      <h2 className="text-lg font-bold">Historial Maestro</h2>
      <div className="relative w-full md:w-80"><span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400">search</span><input disabled placeholder="Buscar por ID o cliente..." className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm opacity-60 dark:border-slate-800 dark:bg-slate-900" /></div>
    </div>
    {archiveError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{archiveError}</p>}
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <table className="w-full text-left text-sm"><thead className="border-b bg-slate-50 text-slate-500 dark:bg-slate-800/50"><tr><th className="px-6 py-3">Fecha</th><th className="px-6 py-3">ID OT</th><th className="px-6 py-3">Cliente</th><th className="px-6 py-3 text-right">Información</th></tr></thead><tbody>
        {archiveLoading ? <tr><td colSpan={4} className="px-6 py-20 text-center text-slate-400">Cargando archivo histórico...</td></tr> : archivedOrders.length === 0 ? <tr><td colSpan={4} className="px-6 py-20 text-center text-slate-400">Sin registros archivados.</td></tr> : archivedOrders.map((order) => <tr key={order.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30"><td className="px-6 py-4 text-xs text-slate-400">{orderDate(order)}</td><td className="px-6 py-4 font-bold uppercase text-slate-900 dark:text-white">{order.id_legible || '—'}</td><td className="px-6 py-4 text-slate-500">{order.cliente || 'Sin Cliente'}</td><td className="px-6 py-4 text-right"><div className="inline-flex items-center gap-2 text-[10px] font-bold"><button type="button" onClick={() => void loadHistoricalOrderDetail(order.id)} disabled={historicalDetailLoading || archiveBusy} className="inline-flex items-center gap-1 rounded-lg border border-primary/10 bg-primary/5 px-2 py-1 text-primary transition-all hover:bg-primary/10 disabled:opacity-40 dark:bg-primary/20"><span className="material-symbols-outlined text-sm">visibility</span>VER DETALLE</button><button type="button" onClick={() => void restoreArchivedOrder(order.id)} disabled={restoringOrderId === order.id || archiveBusy} className="inline-flex items-center gap-1 rounded-lg border border-amber-100 bg-amber-50 px-2 py-1 text-amber-600 transition-all hover:bg-amber-100/50 disabled:opacity-40 dark:border-amber-800 dark:bg-amber-900/20"><span className="material-symbols-outlined text-sm">settings_backup_restore</span>{restoringOrderId === order.id ? 'RESTAURANDO...' : 'RESTAURAR'}</button></div></td></tr>)}
      </tbody></table>
    </div>
  </div>;
  const historicalTotalHours = selectedHistoricalOrder?.reportes.reduce((total, report) => total + Number(report.horas_trabajadas || 0), 0) || 0;
  const historicalReportsContent = selectedHistoricalOrder && <div className="space-y-3">
    {selectedHistoricalOrder.reportes.length === 0 ? (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-xs italic text-slate-400 dark:border-slate-800 dark:bg-slate-800/30">No se encontraron reportes registrados para esta obra.</p>
    ) : selectedHistoricalOrder.reportes.map((report) => (
      <article key={report.id} className="space-y-3 rounded-lg border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
        <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-bold text-slate-900 dark:text-white">{formatWorkDate(report.fecha_trabajo)}</p><p className="text-[10px] font-bold uppercase text-primary">{report.tecnico_nombre}</p></div><p className="text-xs font-bold text-slate-700 dark:text-slate-200">{formatWorkHours(report.horas_trabajadas)}</p></div>
        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300"><p><span className="font-bold text-slate-700 dark:text-slate-200">Trabajo realizado: </span>{report.trabajo_realizado || report.notas || 'Sin descripción técnica'}</p><p><span className="font-bold text-slate-700 dark:text-slate-200">Materiales: </span>{report.material_utilizado || 'Sin materiales registrados'}</p><p><span className="font-bold text-slate-700 dark:text-slate-200">Fotos: </span>{report.fotos_urls?.length || 0} {(report.fotos_urls?.length || 0) === 1 ? 'foto' : 'fotos'}</p></div>
      </article>
    ))}
  </div>;
  const historicalDetailModal = selectedHistoricalOrder && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="historical-order-title">
    <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between rounded-t-xl border-b bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-800/50"><div><h3 id="historical-order-title" className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white"><span className="material-symbols-outlined text-primary">inventory_2</span>Resumen de Obra Histórica</h3><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{selectedHistoricalOrder.id_legible}</p></div><button type="button" onClick={() => setSelectedHistoricalOrder(null)} disabled={Boolean(restoringOrderId)} className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-slate-200 disabled:opacity-40 dark:hover:bg-slate-800" aria-label="Cerrar"><span className="material-symbols-outlined">close</span></button></div>
      <div className="flex-1 space-y-8 overflow-y-auto p-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2"><div className="space-y-4"><h4 className="border-b pb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Información del Cliente</h4><div className="space-y-2"><p className="text-sm font-bold">{selectedHistoricalOrder.cliente || 'Sin nombre'}</p><p className="text-xs text-slate-500">{selectedHistoricalOrder.direccion || 'Sin dirección registrada'}</p></div></div><div className="space-y-4"><h4 className="border-b pb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Datos Operativos</h4><div className="space-y-2 text-xs"><div className="flex justify-between gap-4"><span className="text-slate-400">Estado:</span><span className="font-bold">{selectedHistoricalOrder.estado}</span></div><div className="flex justify-between gap-4"><span className="text-slate-400">Estado previo:</span><span className="font-bold">{selectedHistoricalOrder.estado_previo || 'Finalizada (legado)'}</span></div><div className="flex justify-between gap-4"><span className="text-slate-400">Cliente:</span><span className="font-bold">{selectedHistoricalOrder.cliente || '—'}</span></div><div className="flex justify-between gap-4"><span className="text-slate-400">Cierre:</span><span className="font-bold">{selectedHistoricalOrder.fecha_cierre?.slice(0, 10) || '—'}</span></div><div className="flex justify-between gap-4"><span className="text-slate-400">Creada el:</span><span className="font-bold">{selectedHistoricalOrder.creado_en?.slice(0, 10) || '—'}</span></div></div></div></div>
        <section className="space-y-4"><div className="flex items-center justify-between border-b pb-1"><h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Intervenciones Realizadas</h4><span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">{selectedHistoricalOrder.reportes.length} Reportes</span></div><p className="text-xs font-bold text-slate-700 dark:text-slate-200">Tiempo total: {formatWorkHours(historicalTotalHours)}</p>{historicalReportsContent}</section>
      </div>
      <div className="flex items-center justify-between rounded-b-xl border-t bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-800/50"><p className="max-w-[250px] text-[10px] text-slate-400">Restaurar devolverá esta obra al circuito operativo.</p><button type="button" onClick={() => void restoreArchivedOrder(selectedHistoricalOrder.id)} disabled={Boolean(restoringOrderId) || archiveBusy} className="flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-2 text-xs font-bold text-slate-950 shadow-md transition-all hover:bg-amber-600 disabled:opacity-40"><span className="material-symbols-outlined text-lg">settings_backup_restore</span>{restoringOrderId === selectedHistoricalOrder.id ? 'RESTAURANDO...' : 'RESTAURAR AHORA'}</button></div>
    </div>
  </div>;
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
            <article className="flex min-h-[340px] flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="space-y-6"><div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary"><span className="material-symbols-outlined text-3xl">folder_zip</span></div><div><h3 className="text-lg font-bold">Galería Multimedia</h3><p className="text-sm leading-relaxed text-slate-500">Archivo comprimido de todas las evidencias táctiles y fotográficas.</p></div><p className="text-[9px] font-bold uppercase text-rose-400">NO CIERRE LA VENTANA</p></div><div className="grid grid-cols-2 gap-3"><button disabled className="rounded-lg bg-blue-900 py-2 text-[10px] font-bold uppercase tracking-widest text-white opacity-60">☁ DRIVE</button><button type="button" onClick={() => mediaJob?.estado === 'completed' ? void downloadMediaBackup(mediaJob.id) : void startMediaBackup()} disabled={mediaBusy || mediaStartInFlight || mediaRecoveryLoading || activeMediaStates.includes(mediaJob?.estado || 'completed')} className="cursor-pointer rounded-lg border border-slate-200 bg-slate-100 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">{mediaJob?.estado === 'completed' ? '📁 DESCARGAR COPIA' : '📁 ZIP LOCAL'}</button></div></article>
          </div>
          {mediaJob && <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">{mediaJob.estado === 'completed' ? <div className="space-y-1 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-[10px] text-emerald-800"><p className="font-bold">COPIA MULTIMEDIA LISTA</p><p>Evidencias: {mediaJob.processed_items} / {mediaJob.total_items}</p>{mediaJob.processed_bytes > 0 && <p>Tamaño: {formatBytes(mediaJob.processed_bytes)}</p>}<p>Estado: {mediaJob.estado}</p><button type="button" onClick={() => void downloadMediaBackup(mediaJob.id)} disabled={mediaBusy} className="mt-2 inline-flex rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">DESCARGAR COPIA ZIP</button></div> : <><p className="text-[10px] font-bold uppercase text-primary">{mediaStatusTitle[mediaJob.estado]}</p>{mediaProgressRows(mediaJob)}{mediaJob.estado === 'failed' && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{mediaJob.error_summary}</p>}</>}</div>}
          <div className="flex justify-around rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900"><div><p className="text-[10px] font-bold uppercase text-slate-400">Total Obras</p><p className="text-xl font-bold">—</p></div><div className="h-10 w-px bg-slate-100 dark:bg-slate-800" /><div><p className="text-[10px] font-bold uppercase text-slate-400">Pend. Optimización</p><p className="text-xl font-bold text-amber-500">—</p></div><div className="h-10 w-px bg-slate-100 dark:bg-slate-800" /><div><p className="text-[10px] font-bold uppercase text-slate-400">Conexión Drive</p><p className="text-xl font-bold text-slate-300">INACTIVA</p></div></div>
        </div>}
        {activeTab === 'restaurar' && <div className="animate-in slide-in-from-bottom-5 space-y-8"><div className="flex items-center gap-8 rounded-xl bg-rose-600 p-8 text-white shadow-lg"><div className="flex size-16 items-center justify-center rounded-lg bg-white/20"><span className="material-symbols-outlined text-4xl">medical_services</span></div><div><h2 className="text-2xl font-bold">Estrategia de Rescate</h2><p className="text-sm font-medium text-rose-100 opacity-80">Restauración de infraestructura en caso de incidencia operacional severa.</p></div></div><div className="grid grid-cols-1 gap-8 text-center md:grid-cols-2"><div className="space-y-4 rounded-xl border-2 border-dashed border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900"><h4 className="text-lg font-bold uppercase">Vincular Archivo Maestro</h4><p className="text-sm text-slate-500">Repone la estructura de datos administrativa (.JSON).</p><button disabled className="w-full rounded-lg bg-slate-100 py-2 text-xs font-bold text-slate-400 dark:bg-slate-800">PROTEGIDO POR ADMIN</button></div><div className="space-y-4 rounded-xl border-2 border-dashed border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900"><h4 className="text-lg font-bold uppercase">Cargar Galería ZIP</h4><p className="text-sm text-slate-500">Reconstituye el carrete multimedia global (.ZIP).</p><button disabled className="w-full rounded-lg bg-slate-100 py-2 text-xs font-bold text-slate-400 dark:bg-slate-800">PROTEGIDO POR ADMIN</button></div></div></div>}
        {activeTab === 'compactar' && <div className="animate-in slide-in-from-bottom-5 space-y-8"><div className="flex items-center gap-8 rounded-xl bg-amber-500 p-8 text-slate-950 shadow-md"><div className="flex size-16 items-center justify-center rounded-lg bg-white/20"><span className="material-symbols-outlined text-4xl">cleaning_services</span></div><div><h2 className="text-2xl font-bold">Optimización de Registros</h2><p className="text-sm font-medium text-amber-950 opacity-70">Seleccione las obras finalizadas que desea mover al historial administrativo.</p></div></div><div className="space-y-4"><div className="flex items-center justify-between"><div className="flex items-center gap-4"><h3 className="text-lg font-bold">Órdenes Finalizadas</h3><span className="rounded-lg bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">{finalizedOrders.length} DISPONIBLES</span></div><div className="flex gap-3"><button type="button" onClick={toggleAllArchiveOrders} disabled={archiveLoading || archiveBusy || finalizedOrders.length === 0} className="text-xs font-bold text-slate-300 disabled:opacity-60">SELECCIONAR TODO</button><button type="button" onClick={() => void archiveSelectedOrders()} disabled={archiveLoading || archiveBusy || selectedArchiveIds.size === 0} className="rounded-lg bg-amber-500 px-6 py-2 text-xs font-bold disabled:opacity-30 disabled:grayscale">ARCHIVAR {selectedArchiveIds.size} SELECCIONADAS</button></div></div>{archiveError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{archiveError}</p>}<div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"><table className="w-full text-left text-sm"><thead className="border-b bg-slate-50 text-slate-500 dark:bg-slate-800/50"><tr><th className="px-6 py-3"><input type="checkbox" checked={finalizedOrders.length > 0 && selectedArchiveIds.size === finalizedOrders.length} onChange={toggleAllArchiveOrders} disabled={archiveLoading || archiveBusy || finalizedOrders.length === 0} /></th><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">ID OT</th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Aseguradora</th><th className="px-4 py-3 text-right">Estado</th></tr></thead><tbody>{archiveLoading ? <tr><td colSpan={6} className="px-6 py-20 text-center italic text-slate-400">Cargando órdenes finalizadas...</td></tr> : finalizedOrders.length === 0 ? <tr><td colSpan={6} className="px-6 py-20 text-center italic text-slate-400">No hay órdenes finalizadas pendientes de optimización.</td></tr> : finalizedOrders.map((order) => <tr key={order.id} onClick={() => toggleArchiveOrder(order.id)} className={`cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30 ${selectedArchiveIds.has(order.id) ? 'bg-primary/5 dark:bg-primary/10' : ''}`}><td className="px-6 py-4"><input type="checkbox" checked={selectedArchiveIds.has(order.id)} onChange={() => toggleArchiveOrder(order.id)} onClick={(event) => event.stopPropagation()} disabled={archiveBusy} /></td><td className="px-4 py-4 text-xs text-slate-400">{orderDate(order)}</td><td className="px-4 py-4 font-bold uppercase text-slate-900 dark:text-white">{order.id_legible || '—'}</td><td className="px-4 py-4 text-slate-500">{order.cliente || 'Sin Cliente'}</td><td className="px-4 py-4 text-xs font-bold uppercase text-slate-400">{order.aseguradora || '—'}</td><td className="px-4 py-4 text-right"><span className="rounded bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase text-green-700 dark:bg-green-900/20">{order.estado}</span></td></tr>)}</tbody></table></div><p className="text-center text-[10px] italic text-slate-400">Optimizar registros ayuda a mantener la rapidez del sistema al mover datos operativos pesados al historial administrativo.</p></div></div>}
        {activeTab === 'archivados' && historyContent}
      </div>
    </div>
    {historicalDetailModal}
  </div>;
}
