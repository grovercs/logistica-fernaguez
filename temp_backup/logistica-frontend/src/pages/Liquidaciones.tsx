import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Reporte {
  id: string;
  orden_id: string;
  tecnico_id: string;
  horas_trabajadas: number;
  creado_en: string;
  estado_liquidacion: string;
  ordenes: { id_legible: string; cliente: string; estado: string } | null;
  perfiles: { nombre_completo: string; tarifa_hora: number } | null;
}

type TabType = 'obra' | 'trabajador' | 'global';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

const getInitials = (name: string) =>
  name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700',
  'bg-violet-100 text-violet-700', 'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700', 'bg-cyan-100 text-cyan-700',
];
const avatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

// ─── Component ────────────────────────────────────────────────────────────────
export default function Liquidaciones() {
  const [tab, setTab] = useState<TabType>('obra');
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [perfilesMap, setPerfilesMap] = useState<Record<string, { nombre: string; tarifa: number }>>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [trabajadorFilter, setTrabajadorFilter] = useState('');
  const [obraFilter, setObraFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);

    const { data: reportesData, error: repErr } = await supabase
      .from('reportes')
      .select('id, orden_id, tecnico_id, horas_trabajadas, creado_en, estado_liquidacion, ordenes!inner(id_legible, cliente, estado)')
      .order('creado_en', { ascending: false });

    // Fetch all perfiles separately (Supabase doesn't recognize tecnico_id FK to perfiles)
    const { data: perfilesData } = await supabase
      .from('perfiles')
      .select('id, nombre_completo, tarifa_hora');

    if (!repErr && reportesData && perfilesData) {
      // Build perfiles lookup map by id
      const perfilesLookup: Record<string, { nombre_completo: string; tarifa_hora: number }> = {};
      perfilesData.forEach((p: any) => {
        perfilesLookup[p.id] = { nombre_completo: p.nombre_completo, tarifa_hora: p.tarifa_hora || 0 };
      });

      // Merge perfiles into reportes
      const merged = (reportesData as any[]).map((r: any) => ({
        ...r,
        perfiles: perfilesLookup[r.tecnico_id] || null,
      }));

      setReportes(merged as Reporte[]);

      // Build worker filter dropdown map
      const map: Record<string, { nombre: string; tarifa: number }> = {};
      merged.forEach(r => {
        if (r.tecnico_id && r.perfiles?.nombre_completo) {
          map[r.tecnico_id] = { nombre: r.perfiles.nombre_completo, tarifa: r.perfiles.tarifa_hora || 0 };
        }
      });
      setPerfilesMap(map);
    }

    setLoading(false);
  };

  // ─── Filtered data ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return reportes.filter(r => {
      if (desde && r.creado_en < desde) return false;
      if (hasta && r.creado_en > hasta + 'T23:59:59') return false;
      if (trabajadorFilter && r.tecnico_id !== trabajadorFilter) return false;
      if (obraFilter) {
        const q = obraFilter.toLowerCase();
        const ref = r.ordenes?.id_legible?.toLowerCase() || '';
        const obra = r.ordenes?.cliente?.toLowerCase() || '';
        if (!ref.includes(q) && !obra.includes(q)) return false;
      }
      if (estadoFilter && r.estado_liquidacion !== estadoFilter) return false;
      return true;
    });
  }, [reportes, desde, hasta, trabajadorFilter, obraFilter, estadoFilter]);

  // ─── Aggregations ─────────────────────────────────────────────────────────
  const totalHoras = filtered.reduce((s, r) => s + (r.horas_trabajadas || 0), 0);
  const totalCoste = filtered.reduce((s, r) => s + (r.horas_trabajadas || 0) * (r.perfiles?.tarifa_hora || 0), 0);

  // Group by obra
  const byObra = useMemo(() => {
    const m: Record<string, Reporte[]> = {};
    filtered.forEach(r => {
      const key = r.ordenes?.id_legible || r.orden_id;
      if (!m[key]) m[key] = [];
      m[key].push(r);
    });
    return m;
  }, [filtered]);

  // Group by worker
  const byWorker = useMemo(() => {
    const m: Record<string, { nombre: string; tarifa: number; reportes: Reporte[] }> = {};
    filtered.forEach(r => {
      const key = r.tecnico_id;
      if (!m[key]) m[key] = { nombre: r.perfiles?.nombre_completo || 'Desconocido', tarifa: r.perfiles?.tarifa_hora || 0, reportes: [] };
      m[key].reportes.push(r);
    });
    return m;
  }, [filtered]);

  // ─── Actions ─────────────────────────────────────────────────────────────
  const toggleEstado = async (id: string, current: string) => {
    const next = current === 'Procesada' ? 'Pendiente' : 'Procesada';
    await supabase.from('reportes').update({ estado_liquidacion: next }).eq('id', id);
    setReportes(prev => prev.map(r => r.id === id ? { ...r, estado_liquidacion: next } : r));
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Raw data
    const rawData = filtered.map((r, i) => ({
      'Nº': i + 1,
      'Referencia': r.ordenes?.id_legible || '-',
      'Obra': r.ordenes?.cliente || '-',
      'Fecha Intervención': fmtDate(r.creado_en),
      'Trabajador': r.perfiles?.nombre_completo || '-',
      'Horas': r.horas_trabajadas || 0,
      'Tarifa €/h': r.perfiles?.tarifa_hora || 0,
      'Subtotal (€)': ((r.horas_trabajadas || 0) * (r.perfiles?.tarifa_hora || 0)).toFixed(2),
      'Estado': r.estado_liquidacion || 'Pendiente',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rawData), 'Datos Completos');

    // Sheet 2: Per worker summary
    const workerData = Object.values(byWorker).map(w => ({
      'Trabajador': w.nombre,
      'Tarifa €/h': w.tarifa,
      'Total Horas': w.reportes.reduce((s, r) => s + (r.horas_trabajadas || 0), 0).toFixed(2),
      'Total €': (w.reportes.reduce((s, r) => s + (r.horas_trabajadas || 0), 0) * w.tarifa).toFixed(2),
      'Intervenciones': w.reportes.length,
      'Procesadas': w.reportes.filter(r => r.estado_liquidacion === 'Procesada').length,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(workerData), 'Por Trabajador');

    // Sheet 3: Per obra summary
    const obraData = Object.entries(byObra).map(([ref, rs]) => ({
      'Referencia': ref,
      'Obra': rs[0]?.ordenes?.cliente || '-',
      'Estado Orden': rs[0]?.ordenes?.estado || '-',
      'Total Horas': rs.reduce((s, r) => s + (r.horas_trabajadas || 0), 0).toFixed(2),
      'Total Coste €': rs.reduce((s, r) => s + (r.horas_trabajadas || 0) * (r.perfiles?.tarifa_hora || 0), 0).toFixed(2),
      'Intervenciones': rs.length,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(obraData), 'Por Obra');

    XLSX.writeFile(wb, `Liquidaciones_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // ─── UI ──────────────────────────────────────────────────────────────────
  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'obra', label: 'Por Obra', icon: 'construction' },
    { key: 'trabajador', label: 'Por Trabajador', icon: 'engineering' },
    { key: 'global', label: 'Global', icon: 'bar_chart' },
  ];

  const EstadoBadge = ({ estado, id }: { estado: string; id: string }) => (
    <button
      onClick={() => toggleEstado(id, estado)}
      title="Clic para cambiar estado"
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer transition-all hover:scale-105 ${
        estado === 'Procesada'
          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
      }`}
    >
      {estado === 'Procesada' ? '✓ Procesada' : '⏳ Pendiente'}
    </button>
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 h-full">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 w-full backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between px-4 sm:px-8 py-4 gap-4">
          <h2 className="text-xl font-black tracking-tight">Liquidaciones</h2>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={exportToExcel} 
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-600/20"
            >
              <span className="material-symbols-outlined text-lg">table_view</span>
              Exportar Excel
            </button>
            <button className="p-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-5 max-w-7xl mx-auto w-full">

        {/* Filters */}
        <section className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Desde</label>
              <input value={desde} onChange={e => setDesde(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm h-11 px-4 focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="date" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Hasta</label>
              <input value={hasta} onChange={e => setHasta(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm h-11 px-4 focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="date" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Trabajador</label>
              <select value={trabajadorFilter} onChange={e => setTrabajadorFilter(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm h-11 px-4 focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none cursor-pointer">
                <option value="">Todos</option>
                {Object.entries(perfilesMap).map(([id, { nombre }]) => (
                  <option key={id} value={id}>{nombre}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Obra / Ref</label>
              <input value={obraFilter} onChange={e => setObraFilter(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm h-11 px-4 focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Buscar..." type="text" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Estado Pago</label>
              <select value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm h-11 px-4 focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none cursor-pointer">
                <option value="">Todos</option>
                <option value="Pendiente">⏳ Pendiente</option>
                <option value="Procesada">✓ Procesada</option>
              </select>
            </div>
            <button onClick={() => { setDesde(''); setHasta(''); setTrabajadorFilter(''); setObraFilter(''); setEstadoFilter(''); }} className="h-11 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-sm">filter_alt_off</span>
              Limpiar
            </button>
          </div>
        </section>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Intervenciones</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black">{filtered.length}</span>
              <span className="text-sm text-slate-400">registros</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">{filtered.filter(r => r.estado_liquidacion === 'Procesada').length} procesadas</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Horas</p>
            <div className="flex items-baseline gap-1.5 text-primary">
              <span className="text-2xl font-black">{totalHoras.toFixed(1)}</span>
              <span className="text-sm font-bold uppercase">horas</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Suma de todas las intervenciones</p>
          </div>
          <div className="bg-primary p-5 rounded-xl shadow-lg shadow-primary/20 text-white relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider mb-1">Total Coste Mano de Obra</p>
              <span className="text-2xl font-black">{fmtCurrency(totalCoste)}</span>
              <p className="text-[10px] text-white/60 mt-1">Basado en tarifas por trabajador</p>
            </div>
            <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-[90px] opacity-10 leading-none">account_balance_wallet</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-full sm:w-fit overflow-x-auto scrollbar-none">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                tab === t.key
                  ? 'bg-white dark:bg-slate-900 text-primary shadow-lg shadow-black/5'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <span className="material-symbols-outlined text-base">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            <p className="text-slate-400 font-medium">Cargando datos de liquidaciones...</p>
          </div>
        ) : (
          <>
            {/* ── TAB: POR OBRA ─────────────────────────────────────────── */}
            {tab === 'obra' && (
              <div className="space-y-6">
                {Object.keys(byObra).length === 0 ? (
                  <div className="text-center py-16 text-slate-400 italic">No hay intervenciones que coincidan con los filtros.</div>
                ) : (
                  Object.entries(byObra).map(([ref, rs]) => {
                    const obraHoras = rs.reduce((s, r) => s + (r.horas_trabajadas || 0), 0);
                    const obraCoste = rs.reduce((s, r) => s + (r.horas_trabajadas || 0) * (r.perfiles?.tarifa_hora || 0), 0);
                    return (
                      <div key={ref} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        {/* Obra header */}
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">construction</span>
                            <div>
                              <span className="font-bold text-primary">{ref}</span>
                              <span className="text-slate-600 dark:text-slate-400 font-medium"> — {rs[0]?.ordenes?.cliente}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-slate-500">{obraHoras.toFixed(1)} h</span>
                            <span className="font-bold text-slate-800 dark:text-white">{fmtCurrency(obraCoste)}</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${rs[0]?.ordenes?.estado === 'Completada' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {rs[0]?.ordenes?.estado || 'Activa'}
                            </span>
                          </div>
                        </div>
                        {/* Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm min-w-[700px]">
                            <thead>
                              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                                <th className="px-6 py-3">Trabajador</th>
                                <th className="px-6 py-3">Fecha</th>
                                <th className="px-6 py-3 text-center">Horas</th>
                                <th className="px-6 py-3 text-right">Tarifa</th>
                                <th className="px-6 py-3 text-right">Subtotal</th>
                                <th className="px-6 py-3 text-center">Estado</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                              {rs.map(r => (
                                <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                  <td className="px-6 py-3.5">
                                    <div className="flex items-center gap-2.5">
                                      <div className={`size-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${avatarColor(r.perfiles?.nombre_completo || '')}`}>
                                        {getInitials(r.perfiles?.nombre_completo || '?')}
                                      </div>
                                      <span className="font-medium">{r.perfiles?.nombre_completo || 'Desconocido'}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-3.5 text-slate-500">{fmtDate(r.creado_en)}</td>
                                  <td className="px-6 py-3.5 text-center font-bold">{(r.horas_trabajadas || 0).toFixed(1)}</td>
                                  <td className="px-6 py-3.5 text-right text-slate-500">{fmtCurrency(r.perfiles?.tarifa_hora || 0)}</td>
                                  <td className="px-6 py-3.5 text-right font-bold">{fmtCurrency((r.horas_trabajadas || 0) * (r.perfiles?.tarifa_hora || 0))}</td>
                                  <td className="px-6 py-3.5 text-center">
                                    <EstadoBadge estado={r.estado_liquidacion || 'Pendiente'} id={r.id} />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── TAB: POR TRABAJADOR ───────────────────────────────────── */}
            {tab === 'trabajador' && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {Object.keys(byWorker).length === 0 ? (
                  <div className="col-span-3 text-center py-16 text-slate-400 italic">No hay intervenciones que coincidan con los filtros.</div>
                ) : (
                  Object.entries(byWorker).map(([tid, w]) => {
                    const ttlH = w.reportes.reduce((s, r) => s + (r.horas_trabajadas || 0), 0);
                    const ttlE = ttlH * w.tarifa;
                    const procesadas = w.reportes.filter(r => r.estado_liquidacion === 'Procesada').length;
                    return (
                      <div key={tid} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className={`size-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${avatarColor(w.nombre)}`}>
                            {getInitials(w.nombre)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{w.nombre}</p>
                            <p className="text-xs text-slate-400">{fmtCurrency(w.tarifa)}/h · {w.reportes.length} intervenciones</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center">
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Horas</p>
                            <p className="text-lg font-black text-primary">{ttlH.toFixed(1)}</p>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center">
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Total</p>
                            <p className="text-lg font-black">{fmtCurrency(ttlE)}</p>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center">
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Obras</p>
                            <p className="text-lg font-black">{new Set(w.reportes.map(r => r.orden_id)).size}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full bg-emerald-500"></span>
                            <span className="text-slate-500">{procesadas} procesadas</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full bg-amber-500"></span>
                            <span className="text-slate-500">{w.reportes.length - procesadas} pendientes</span>
                          </div>
                        </div>
                        {/* Breakdown list */}
                        <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2 max-h-48 overflow-y-auto">
                          {w.reportes.map(r => (
                            <div key={r.id} className="flex items-center justify-between gap-2 text-xs">
                              <span className="text-slate-500 truncate flex-1">{r.ordenes?.id_legible || '-'} · {fmtDate(r.creado_en)}</span>
                              <span className="font-bold shrink-0">{(r.horas_trabajadas || 0).toFixed(1)}h</span>
                              <EstadoBadge estado={r.estado_liquidacion || 'Pendiente'} id={r.id} />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── TAB: GLOBAL ───────────────────────────────────────────── */}
            {tab === 'global' && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm min-w-[900px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                        <th className="px-5 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Trabajador</th>
                        <th className="px-5 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Referencia</th>
                        <th className="px-5 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Obra</th>
                        <th className="px-5 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                        <th className="px-5 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Horas</th>
                        <th className="px-5 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Tarifa</th>
                        <th className="px-5 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Subtotal</th>
                        <th className="px-5 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {filtered.length === 0 ? (
                        <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-400 italic">No hay registros que coincidan.</td></tr>
                      ) : (
                        filtered.map(r => (
                          <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className={`size-6 rounded-full flex items-center justify-center font-bold text-[9px] shrink-0 ${avatarColor(r.perfiles?.nombre_completo || '')}`}>
                                  {getInitials(r.perfiles?.nombre_completo || '?')}
                                </div>
                                <span className="font-medium">{r.perfiles?.nombre_completo || 'Desconocido'}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-primary font-medium">{r.ordenes?.id_legible || '-'}</td>
                            <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400 max-w-[180px] truncate">{r.ordenes?.cliente || '-'}</td>
                            <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">{fmtDate(r.creado_en)}</td>
                            <td className="px-5 py-3.5 text-center font-bold">{(r.horas_trabajadas || 0).toFixed(1)}</td>
                            <td className="px-5 py-3.5 text-right text-slate-500">{fmtCurrency(r.perfiles?.tarifa_hora || 0)}</td>
                            <td className="px-5 py-3.5 text-right font-bold">{fmtCurrency((r.horas_trabajadas || 0) * (r.perfiles?.tarifa_hora || 0))}</td>
                            <td className="px-5 py-3.5 text-center">
                              <EstadoBadge estado={r.estado_liquidacion || 'Pendiente'} id={r.id} />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {filtered.length > 0 && (
                      <tfoot>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-t-2 border-slate-200 dark:border-slate-700 font-bold">
                          <td className="px-5 py-4 text-sm" colSpan={4}>Total ({filtered.length} registros)</td>
                          <td className="px-5 py-4 text-center text-primary">{totalHoras.toFixed(1)}</td>
                          <td></td>
                          <td className="px-5 py-4 text-right text-primary">{fmtCurrency(totalCoste)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
