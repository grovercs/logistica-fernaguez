import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Liquidacion {
  id: string;
  trabajador_id: string;
  periodo: string;
  estado: 'abierta' | 'cerrada';
  horas_totales: number;
  tarifa_hora: number | null;
  importe_calculado: number;
  importe_manual: number | null;
  importe_aplicado: number;
  total_bonus: number;
  importe_nomina: number | null;
  total_liquidar: number;
  observaciones: string | null;
  abierta_en: string;
  cerrada_en: string | null;
  actualizado_en: string;
}

// Bonus mantenido en sesión actual. El backend V1 no expone aún una RPC de lectura
// de bonus individuales; ver GAP documentado en el plan.
interface SessionBonus {
  id: string;
  liquidacion_id: string;
  concepto: string;
  importe: number;
  orden_id: string | null;
  isNew: boolean;
  isDeleted?: boolean;
}

interface TrabajadorOption {
  id: string;
  nombre: string;
  apellidos: string | null;
  auth_user_id: string | null;
  especialidad: string | null;
  estado: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtCurrency = (n: number | null | undefined) => {
  if (n == null) return '-';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
};

const fmtNumber = (n: number | null | undefined, decimals = 2) => {
  if (n == null) return '-';
  return n.toFixed(decimals);
};

const periodoLabel = (periodo: string) => {
  const [year, month] = periodo.split('-');
  return `${month}/${year}`;
};

const getInitials = (name: string) =>
  name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700',
  'bg-violet-100 text-violet-700', 'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700', 'bg-cyan-100 text-cyan-700',
];
const avatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

const parseErrorMessage = (error: { message?: string } | null | undefined): string => {
  const msg = error?.message || '';
  if (msg.includes('TRABAJADOR_AUTH_NOT_LINKED')) return 'El trabajador no tiene usuario vinculado.';
  if (msg.includes('LIQUIDACION_ALREADY_EXISTS')) return 'Ya existe una liquidación para este trabajador y periodo.';
  if (msg.includes('FORBIDDEN')) return 'No tienes permiso para realizar esta acción.';
  if (msg.includes('AUTH_REQUIRED')) return 'Debes iniciar sesión para continuar.';
  if (msg.includes('LIQUIDACION_NOT_FOUND')) return 'Liquidación no encontrada.';
  if (msg.includes('LIQUIDACION_ALREADY_CLOSED')) return 'La liquidación ya está cerrada.';
  return msg || 'Ocurrió un error inesperado.';
};

const monthInputToPeriodo = (monthValue: string): string | null => {
  if (!monthValue) return null;
  return `${monthValue}-01`;
};

const todayMonthInput = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Parsea un input numérico. Devuelve null solo si el string está vacío.
// Rechaza NaN. Permite 0.
const parseNumericInput = (value: string): { value: number | null; error?: string } => {
  const trimmed = value.trim();
  if (trimmed === '') return { value: null };
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed)) return { value: null, error: `Valor numérico no válido: "${value}"` };
  return { value: parsed };
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function Liquidaciones() {
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([]);
  const [trabajadores, setTrabajadores] = useState<TrabajadorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [trabajadorFilter, setTrabajadorFilter] = useState('');
  const [periodoFilter, setPeriodoFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<'' | 'abierta' | 'cerrada'>('');

  // Create modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createTrabajadorId, setCreateTrabajadorId] = useState('');
  const [createPeriodoInput, setCreatePeriodoInput] = useState(todayMonthInput());
  const [createLoading, setCreateLoading] = useState(false);

  // Expanded editing row
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sessionBonusMap, setSessionBonusMap] = useState<Record<string, SessionBonus[]>>({});

  const fetchLiquidaciones = useCallback(async () => {
    const { data, error: rpcError } = await supabase.rpc('admin_get_liquidaciones', {
      p_trabajador_id: null,
      p_periodo: null,
      p_estado: null,
      p_limit: 200,
      p_offset: 0,
    });

    if (rpcError) {
      setError(parseErrorMessage(rpcError));
      return;
    }

    const rows = (data || []) as Record<string, unknown>[];
    const mapped: Liquidacion[] = rows.map(row => ({
      id: row.id as string,
      trabajador_id: row.trabajador_id as string,
      periodo: row.periodo as string,
      estado: row.estado as 'abierta' | 'cerrada',
      horas_totales: (row.horas_totales as number | null) ?? 0,
      tarifa_hora: (row.tarifa_hora as number | null) ?? null,
      importe_calculado: (row.importe_calculado as number | null) ?? 0,
      importe_manual: (row.importe_manual as number | null) ?? null,
      importe_aplicado: (row.importe_aplicado as number | null) ?? 0,
      total_bonus: (row.total_bonus as number | null) ?? 0,
      importe_nomina: (row.importe_nomina as number | null) ?? null,
      total_liquidar: (row.total_liquidar as number | null) ?? 0,
      observaciones: (row.observaciones as string | null) ?? null,
      abierta_en: row.abierta_en as string,
      cerrada_en: (row.cerrada_en as string | null) ?? null,
      actualizado_en: row.actualizado_en as string,
    }));

    setLiquidaciones(mapped);
  }, []);

  const fetchTrabajadores = useCallback(async () => {
    const { data, error: rpcError } = await supabase.rpc('get_trabajadores_directory');
    if (rpcError) {
      console.error('Error loading trabajadores directory:', rpcError);
      return;
    }
    const rows = (data || []) as Record<string, unknown>[];
    const mapped: TrabajadorOption[] = rows
      .filter(row => row.estado !== 'Baja')
      .map(row => ({
        id: row.trabajador_id as string,
        nombre: (row.nombre as string) || '',
        apellidos: (row.apellidos as string | null) || null,
        auth_user_id: (row.auth_user_id as string | null) || null,
        especialidad: (row.especialidad as string | null) || null,
        estado: (row.estado as string) || '',
      }))
      .sort((a, b) => `${a.nombre} ${a.apellidos || ''}`.localeCompare(`${b.nombre} ${b.apellidos || ''}`));

    setTrabajadores(mapped);
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      await Promise.all([fetchLiquidaciones(), fetchTrabajadores()]);
      if (mounted) setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, [fetchLiquidaciones, fetchTrabajadores]);

  const trabajadorName = (id: string) => {
    const t = trabajadores.find(x => x.id === id);
    if (!t) return 'Desconocido';
    return `${t.nombre} ${t.apellidos || ''}`.trim();
  };

  const filtered = useMemo(() => {
    return liquidaciones.filter(l => {
      if (trabajadorFilter && l.trabajador_id !== trabajadorFilter) return false;
      if (periodoFilter && l.periodo !== periodoFilter) return false;
      if (estadoFilter && l.estado !== estadoFilter) return false;
      return true;
    });
  }, [liquidaciones, trabajadorFilter, periodoFilter, estadoFilter]);

  const handleGenerar = async () => {
    if (!createTrabajadorId) {
      alert('Selecciona un trabajador.');
      return;
    }
    const periodo = monthInputToPeriodo(createPeriodoInput);
    if (!periodo) {
      alert('Selecciona un periodo válido.');
      return;
    }

    setCreateLoading(true);
    const { error: rpcError } = await supabase.rpc('admin_generar_liquidacion', {
      p_trabajador_id: createTrabajadorId,
      p_periodo: periodo,
    });
    setCreateLoading(false);

    if (rpcError) {
      alert(parseErrorMessage(rpcError));
      return;
    }

    await fetchLiquidaciones();
    setIsCreateOpen(false);
    setCreateTrabajadorId('');
    setCreatePeriodoInput(todayMonthInput());
  };

  const handleRecalcular = async (id: string) => {
    const { error: rpcError } = await supabase.rpc('admin_recalcular_liquidacion', {
      p_liquidacion_id: id,
    });
    if (rpcError) {
      alert(parseErrorMessage(rpcError));
      return;
    }
    await fetchLiquidaciones();
  };

  const handleCerrar = async (id: string) => {
    if (!window.confirm('¿Cerrar la liquidación? Una vez cerrada no podrá editarse.')) return;
    const { error: rpcError } = await supabase.rpc('admin_cerrar_liquidacion', {
      p_liquidacion_id: id,
    });
    if (rpcError) {
      alert(parseErrorMessage(rpcError));
      return;
    }
    setEditingId(null);
    await fetchLiquidaciones();
  };

  const toggleEditRow = (id: string) => {
    setEditingId(prev => (prev === id ? null : id));
  };

  // ─── Summary cards ──────────────────────────────────────────────────────────
  const totalHoras = filtered.reduce((s, l) => s + (l.horas_totales || 0), 0);
  const totalLiquidar = filtered.reduce((s, l) => s + (l.total_liquidar || 0), 0);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 h-full">
      {/* Header */}
      <header className="h-16 flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 sticky top-0 z-10 w-full backdrop-blur-md">
        <h2 className="text-xl font-bold">Liquidaciones</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Nueva liquidación
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-5 max-w-7xl mx-auto w-full">
        {/* Filters */}
        <section className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Trabajador</label>
              <select
                value={trabajadorFilter}
                onChange={e => setTrabajadorFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm h-10 px-3 focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="">Todos los trabajadores</option>
                {trabajadores.map(t => (
                  <option key={t.id} value={t.id}>{`${t.nombre} ${t.apellidos || ''}`.trim()}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Periodo</label>
              <input
                type="month"
                value={periodoFilter ? periodoFilter.slice(0, 7) : ''}
                onChange={e => {
                  const v = e.target.value;
                  setPeriodoFilter(v ? `${v}-01` : '');
                }}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm h-10 px-3 focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estado</label>
              <select
                value={estadoFilter}
                onChange={e => setEstadoFilter(e.target.value as '' | 'abierta' | 'cerrada')}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm h-10 px-3 focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="">Todos</option>
                <option value="abierta">Abierta</option>
                <option value="cerrada">Cerrada</option>
              </select>
            </div>
            <button
              onClick={() => { setTrabajadorFilter(''); setPeriodoFilter(''); setEstadoFilter(''); }}
              className="h-10 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">filter_alt_off</span>
              Limpiar
            </button>
          </div>
        </section>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Liquidaciones</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black">{filtered.length}</span>
              <span className="text-sm text-slate-400">registros</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">{filtered.filter(l => l.estado === 'cerrada').length} cerradas · {filtered.filter(l => l.estado === 'abierta').length} abiertas</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Horas</p>
            <div className="flex items-baseline gap-1.5 text-primary">
              <span className="text-2xl font-black">{totalHoras.toFixed(1)}</span>
              <span className="text-sm font-bold uppercase">horas</span>
            </div>
          </div>
          <div className="bg-primary p-5 rounded-xl shadow-lg shadow-primary/20 text-white relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider mb-1">Total a Liquidar</p>
              <span className="text-2xl font-black">{fmtCurrency(totalLiquidar)}</span>
            </div>
            <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-[90px] opacity-10 leading-none">account_balance_wallet</span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-4 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            <p className="text-slate-400 font-medium">Cargando liquidaciones...</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                    <th className="px-5 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Trabajador</th>
                    <th className="px-5 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Periodo</th>
                    <th className="px-5 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Estado</th>
                    <th className="px-5 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Horas</th>
                    <th className="px-5 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Tarifa/h</th>
                    <th className="px-5 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Importe calculado</th>
                    <th className="px-5 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Importe aplicado</th>
                    <th className="px-5 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Bonus</th>
                    <th className="px-5 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Nómina</th>
                    <th className="px-5 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Total</th>
                    <th className="px-5 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-5 py-12 text-center text-slate-400 italic">
                        No hay liquidaciones que coincidan con los filtros.
                      </td>
                    </tr>
                  ) : (
                    filtered.map(l => (
                      <>
                        <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className={`size-6 rounded-full flex items-center justify-center font-bold text-[9px] shrink-0 ${avatarColor(trabajadorName(l.trabajador_id))}`}>
                                {getInitials(trabajadorName(l.trabajador_id))}
                              </div>
                              <span className="font-medium">{trabajadorName(l.trabajador_id)}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">{periodoLabel(l.periodo)}</td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                              l.estado === 'cerrada'
                                ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                            }`}>
                              {l.estado === 'cerrada' ? 'Cerrada' : 'Abierta'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center font-bold">{fmtNumber(l.horas_totales, 1)}</td>
                          <td className="px-5 py-3.5 text-right text-slate-500">{fmtCurrency(l.tarifa_hora)}</td>
                          <td className="px-5 py-3.5 text-right text-slate-500">{fmtCurrency(l.importe_calculado)}</td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex flex-col items-end">
                              <span className="font-bold">{fmtCurrency(l.importe_aplicado)}</span>
                              <span className={`text-[10px] font-bold ${
                                l.importe_manual == null
                                  ? 'text-emerald-600'
                                  : 'text-blue-600'
                              }`}>
                                {l.importe_manual == null ? 'AUTO' : 'MANUAL'}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right font-bold">{fmtCurrency(l.total_bonus)}</td>
                          <td className="px-5 py-3.5 text-right text-slate-500">{fmtCurrency(l.importe_nomina)}</td>
                          <td className="px-5 py-3.5 text-right font-black text-primary">{fmtCurrency(l.total_liquidar)}</td>
                          <td className="px-5 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => toggleEditRow(l.id)}
                                className="p-1.5 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                title={editingId === l.id ? 'Ocultar detalle' : 'Editar'}
                              >
                                <span className="material-symbols-outlined">{editingId === l.id ? 'expand_less' : 'edit'}</span>
                              </button>
                              {l.estado === 'abierta' && (
                                <button
                                  onClick={() => handleCerrar(l.id)}
                                  className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                                  title="Cerrar liquidación"
                                >
                                  <span className="material-symbols-outlined">lock</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {editingId === l.id && (
                          <tr key={`${l.id}-edit`}>
                            <td colSpan={11} className="px-5 py-4 bg-slate-50/70 dark:bg-slate-800/30">
                              <EditRowPanel
                                key={l.id}
                                liquidacion={l}
                                trabajadores={trabajadores}
                                sessionBonus={sessionBonusMap[l.id] || []}
                                onUpdateBonusMap={next => setSessionBonusMap(prev => ({ ...prev, [l.id]: next }))}
                                onSaved={fetchLiquidaciones}
                                onRecalcular={handleRecalcular}
                                onCerrar={handleCerrar}
                              />
                            </td>
                          </tr>
                        )}
                      </>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Nueva liquidación</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Generar liquidación por trabajador y mes</p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Trabajador</label>
                <select
                  value={createTrabajadorId}
                  onChange={e => setCreateTrabajadorId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm h-10 px-3 focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="">Selecciona un trabajador</option>
                  {trabajadores.map(t => (
                    <option key={t.id} value={t.id}>{`${t.nombre} ${t.apellidos || ''}`.trim()}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Periodo</label>
                <input
                  type="month"
                  value={createPeriodoInput}
                  onChange={e => setCreatePeriodoInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm h-10 px-3 focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGenerar}
                  disabled={createLoading || !createTrabajadorId || !createPeriodoInput}
                  className="px-4 py-2 text-sm font-bold bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  {createLoading ? 'Generando...' : 'Generar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Edit Row Panel ───────────────────────────────────────────────────────────
interface EditRowPanelProps {
  liquidacion: Liquidacion;
  trabajadores: TrabajadorOption[];
  sessionBonus: SessionBonus[];
  onUpdateBonusMap: (bonus: SessionBonus[]) => void;
  onSaved: () => Promise<void>;
  onRecalcular: (id: string) => Promise<void>;
  onCerrar: (id: string) => Promise<void>;
}

function EditRowPanel({
  liquidacion,
  sessionBonus,
  onUpdateBonusMap,
  onSaved,
  onRecalcular,
  onCerrar,
}: EditRowPanelProps) {
  const isOpen = liquidacion.estado === 'abierta';

  const [tarifaHora, setTarifaHora] = useState<string>(liquidacion.tarifa_hora?.toString() || '');
  const [useManualImporte, setUseManualImporte] = useState(liquidacion.importe_manual != null);
  const [importeManual, setImporteManual] = useState<string>(liquidacion.importe_manual?.toString() || '');
  const [importeNomina, setImporteNomina] = useState<string>(liquidacion.importe_nomina?.toString() || '');
  const [observaciones, setObservaciones] = useState(liquidacion.observaciones || '');
  const [saveLoading, setSaveLoading] = useState(false);

  const [newBonusConcepto, setNewBonusConcepto] = useState('');
  const [newBonusImporte, setNewBonusImporte] = useState('');
  const [newBonusOrdenId, setNewBonusOrdenId] = useState('');

  const handleGuardar = async () => {
    setSaveLoading(true);

    const tarifaParsed = parseNumericInput(tarifaHora);
    if (tarifaParsed.error) {
      setSaveLoading(false);
      alert(tarifaParsed.error);
      return;
    }

    let manualParsed: ReturnType<typeof parseNumericInput> = { value: null };
    if (useManualImporte) {
      manualParsed = parseNumericInput(importeManual);
      if (manualParsed.error || manualParsed.value === null) {
        setSaveLoading(false);
        alert(manualParsed.error || 'El importe manual es obligatorio cuando está activado.');
        return;
      }
    }

    const nominaParsed = parseNumericInput(importeNomina);
    if (nominaParsed.error) {
      setSaveLoading(false);
      alert(nominaParsed.error);
      return;
    }

    const { error: rpcError } = await supabase.rpc('admin_update_liquidacion', {
      p_liquidacion_id: liquidacion.id,
      p_tarifa_hora: tarifaParsed.value,
      p_set_importe_manual: true,
      p_importe_manual: manualParsed.value,
      p_importe_nomina: nominaParsed.value === null ? 0 : nominaParsed.value,
      p_set_observaciones: true,
      p_observaciones: observaciones || null,
    });

    if (rpcError) {
      setSaveLoading(false);
      alert(parseErrorMessage(rpcError));
      return;
    }

    await onSaved();
    setSaveLoading(false);
  };

  const handleAgregarBonus = async () => {
    if (!newBonusConcepto.trim()) {
      alert('El concepto del bonus es obligatorio.');
      return;
    }
    const bonusParsed = parseNumericInput(newBonusImporte);
    if (bonusParsed.error || bonusParsed.value === null) {
      alert(bonusParsed.error || 'El importe del bonus es obligatorio.');
      return;
    }
    const importe = bonusParsed.value;

    const { data, error: rpcError } = await supabase.rpc('admin_agregar_bonus', {
      p_liquidacion_id: liquidacion.id,
      p_concepto: newBonusConcepto.trim(),
      p_importe: importe,
      p_orden_id: newBonusOrdenId || null,
    });

    if (rpcError) {
      alert(parseErrorMessage(rpcError));
      return;
    }

    const bonusId = (data as { bonus_id: string }[] | null)?.[0]?.bonus_id;
    if (bonusId) {
      const nuevo: SessionBonus = {
        id: bonusId,
        liquidacion_id: liquidacion.id,
        concepto: newBonusConcepto.trim(),
        importe,
        orden_id: newBonusOrdenId || null,
        isNew: true,
      };
      onUpdateBonusMap([...sessionBonus, nuevo]);
    }

    setNewBonusConcepto('');
    setNewBonusImporte('');
    setNewBonusOrdenId('');
    await onSaved();
  };

  const handleUpdateBonus = async (bonus: SessionBonus) => {
    const concepto = bonus.concepto.trim();
    if (!concepto) {
      alert('El concepto del bonus es obligatorio.');
      return;
    }
    if (bonus.importe < 0) {
      alert('El importe del bonus debe ser mayor o igual a 0.');
      return;
    }

    const { error: rpcError } = await supabase.rpc('admin_update_liquidacion_bonus', {
      p_bonus_id: bonus.id,
      p_set_concepto: true,
      p_concepto: concepto,
      p_set_importe: true,
      p_importe: bonus.importe,
      p_set_orden_id: bonus.orden_id !== undefined,
      p_orden_id: bonus.orden_id || null,
    });

    if (rpcError) {
      alert(parseErrorMessage(rpcError));
      return;
    }

    await onSaved();
  };

  const handleEliminarBonus = async (bonusId: string) => {
    if (!window.confirm('¿Eliminar este bonus?')) return;
    const { error: rpcError } = await supabase.rpc('admin_eliminar_bonus', {
      p_bonus_id: bonusId,
    });
    if (rpcError) {
      alert(parseErrorMessage(rpcError));
      return;
    }
    onUpdateBonusMap(sessionBonus.filter(b => b.id !== bonusId));
    await onSaved();
  };

  const updateSessionBonusField = (id: string, field: keyof SessionBonus, value: unknown) => {
    onUpdateBonusMap(sessionBonus.map(b => (b.id === id ? { ...b, [field]: value } : b)));
  };

  return (
    <div className="space-y-5">
      {/* Breakdown */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Desglose</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-slate-500">Horas × tarifa</p>
            <p className="font-bold text-slate-900 dark:text-slate-100">
              {fmtNumber(liquidacion.horas_totales, 1)} × {fmtCurrency(liquidacion.tarifa_hora)} = {fmtCurrency(liquidacion.importe_calculado)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-slate-500">Importe aplicado</p>
            <p className="font-bold text-slate-900 dark:text-slate-100">{fmtCurrency(liquidacion.importe_aplicado)}</p>
            <p className="text-[10px] font-bold text-slate-400">{liquidacion.importe_manual == null ? 'Automático' : 'Manual'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-slate-500">Total a liquidar</p>
            <p className="text-xl font-black text-primary">{fmtCurrency(liquidacion.total_liquidar)}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
          <span>+ Bonus: <strong className="text-slate-700 dark:text-slate-300">{fmtCurrency(liquidacion.total_bonus)}</strong></span>
          <span>- Nómina: <strong className="text-slate-700 dark:text-slate-300">{fmtCurrency(liquidacion.importe_nomina)}</strong></span>
        </div>
      </div>

      {isOpen ? (
        <>
          {/* Editable fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tarifa / hora</label>
              <input
                type="number"
                step="0.01"
                value={tarifaHora}
                onChange={e => setTarifaHora(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm h-10 px-3 focus:ring-2 focus:ring-primary outline-none"
                placeholder="Automático"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Importe manual</label>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={`manual-${liquidacion.id}`}
                  checked={useManualImporte}
                  onChange={e => {
                    const checked = e.target.checked;
                    setUseManualImporte(checked);
                    if (!checked) setImporteManual('');
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <label htmlFor={`manual-${liquidacion.id}`} className="text-sm text-slate-700 dark:text-slate-300">Usar importe manual</label>
                <input
                  type="number"
                  step="0.01"
                  value={importeManual}
                  disabled={!useManualImporte}
                  onChange={e => setImporteManual(e.target.value)}
                  className="flex-1 min-w-[120px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm h-10 px-3 focus:ring-2 focus:ring-primary outline-none disabled:opacity-50"
                  placeholder={useManualImporte ? 'Importe' : 'Automático'}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nómina</label>
              <input
                type="number"
                step="0.01"
                value={importeNomina}
                onChange={e => setImporteNomina(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm h-10 px-3 focus:ring-2 focus:ring-primary outline-none"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Observaciones</label>
            <textarea
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm p-3 focus:ring-2 focus:ring-primary outline-none min-h-[80px]"
              placeholder="Notas internas..."
            />
          </div>

          {/* Bonus section */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Bonus de esta sesión</p>
              <p className="text-xs text-slate-400">Los bonus históricos no están disponibles hasta resolver el GAP de backend.</p>
            </div>

            {sessionBonus.length > 0 && (
              <div className="space-y-2">
                {sessionBonus.map(b => (
                  <div key={b.id} className="flex flex-wrap items-end gap-2">
                    <input
                      type="text"
                      value={b.concepto}
                      onChange={e => updateSessionBonusField(b.id, 'concepto', e.target.value)}
                      className="flex-1 min-w-[150px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm h-9 px-3 focus:ring-2 focus:ring-primary outline-none"
                      placeholder="Concepto"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={b.importe}
                      onChange={e => updateSessionBonusField(b.id, 'importe', parseFloat(e.target.value) || 0)}
                      className="w-28 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm h-9 px-3 focus:ring-2 focus:ring-primary outline-none"
                      placeholder="Importe"
                    />
                    <input
                      type="text"
                      value={b.orden_id || ''}
                      onChange={e => updateSessionBonusField(b.id, 'orden_id', e.target.value || null)}
                      className="w-40 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm h-9 px-3 focus:ring-2 focus:ring-primary outline-none"
                      placeholder="Orden ID (opcional)"
                    />
                    <button
                      onClick={() => handleUpdateBonus(b)}
                      className="p-2 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      title="Guardar cambios"
                    >
                      <span className="material-symbols-outlined">save</span>
                    </button>
                    <button
                      onClick={() => handleEliminarBonus(b.id)}
                      className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Eliminar bonus"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <input
                type="text"
                value={newBonusConcepto}
                onChange={e => setNewBonusConcepto(e.target.value)}
                className="flex-1 min-w-[150px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm h-9 px-3 focus:ring-2 focus:ring-primary outline-none"
                placeholder="Nuevo concepto"
              />
              <input
                type="number"
                step="0.01"
                value={newBonusImporte}
                onChange={e => setNewBonusImporte(e.target.value)}
                className="w-28 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm h-9 px-3 focus:ring-2 focus:ring-primary outline-none"
                placeholder="Importe"
              />
              <input
                type="text"
                value={newBonusOrdenId}
                onChange={e => setNewBonusOrdenId(e.target.value)}
                className="w-40 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm h-9 px-3 focus:ring-2 focus:ring-primary outline-none"
                placeholder="Orden ID (opcional)"
              />
              <button
                onClick={handleAgregarBonus}
                className="px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Añadir bonus
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <button
              onClick={() => onRecalcular(liquidacion.id)}
              className="px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-sm align-middle mr-1">replay</span>
              Recalcular
            </button>
            <button
              onClick={handleGuardar}
              disabled={saveLoading}
              className="px-4 py-2 text-sm font-bold bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {saveLoading ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button
              onClick={() => onCerrar(liquidacion.id)}
              className="px-4 py-2 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              Cerrar liquidación
            </button>
          </div>
        </>
      ) : (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 p-4 rounded-xl text-sm">
          Liquidación cerrada. Solo lectura.
        </div>
      )}
    </div>
  );
}
