import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Liquidacion {
  id: string;
  trabajador_id: string;
  periodo: string;
  estado: 'abierta' | 'cerrada';
  horas_totales: number;
  tarifa_hora: number | null;
  tarifa_hora_capturada?: number | null;
  usar_tarifa_puntual: boolean;
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

interface LiquidacionBonus {
  id: string;
  liquidacion_id: string;
  concepto: string;
  importe: number;
  orden_id: string | null;
  orden_numero: string | null;
  orden_descripcion: string | null;
  creado_en: string;
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
  if (msg.includes('LIQUIDACION_NOT_OPEN')) return 'Solo se pueden eliminar liquidaciones abiertas.';
  if (msg.includes('TARIFA_PUNTUAL_REQUERIDA')) return 'Debes indicar la tarifa puntual cuando está activada.';
  if (msg.includes('IMPORTE_MANUAL_REQUERIDO')) return 'Debes indicar el importe manual cuando está activado.';
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
export default function LiquidacionesGestion() {
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

  // Expanded detail row
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [bonusMap, setBonusMap] = useState<Record<string, LiquidacionBonus[]>>({});
  const [bonusLoadingMap, setBonusLoadingMap] = useState<Record<string, boolean>>({});
  const [refreshKey, setRefreshKey] = useState(0);

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
      tarifa_hora_capturada: (row.tarifa_hora_capturada as number | null) ?? null,
      usar_tarifa_puntual: (row.usar_tarifa_puntual as boolean) ?? false,
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

  const fetchBonus = useCallback(async (liquidacionId: string) => {
    setBonusLoadingMap(prev => ({ ...prev, [liquidacionId]: true }));
    const { data, error: rpcError } = await supabase.rpc('admin_get_liquidacion_bonus', {
      p_liquidacion_id: liquidacionId,
    });
    if (rpcError) {
      console.error('Error loading bonus:', rpcError);
      alert(parseErrorMessage(rpcError));
    } else {
      setBonusMap(prev => ({ ...prev, [liquidacionId]: (data || []) as LiquidacionBonus[] }));
    }
    setBonusLoadingMap(prev => ({ ...prev, [liquidacionId]: false }));
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

  const handleRecalcular = async (liquidacionId: string) => {
    const { error: rpcError } = await supabase.rpc('admin_recalcular_liquidacion', {
      p_liquidacion_id: liquidacionId,
    });
    if (rpcError) {
      alert(parseErrorMessage(rpcError));
      return;
    }

    await fetchLiquidaciones();
    setRefreshKey(k => k + 1);
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
    setExpandedId(null);
    await fetchLiquidaciones();
    setRefreshKey(k => k + 1);
  };

  const handleEliminar = async (id: string) => {
    const l = liquidaciones.find(x => x.id === id);
    if (l?.estado === 'cerrada') {
      alert('Solo se pueden eliminar liquidaciones abiertas.');
      return;
    }

    if (!window.confirm('¿Eliminar esta liquidación? Se borrarán sus líneas y bonus, pero no los partes, órdenes ni trabajadores originales.')) return;

    const { error: rpcError } = await supabase.rpc('admin_eliminar_liquidacion', {
      p_liquidacion_id: id,
    });
    if (rpcError) {
      alert(parseErrorMessage(rpcError));
      return;
    }
    setExpandedId(prev => (prev === id ? null : prev));
    await fetchLiquidaciones();
    setRefreshKey(k => k + 1);
  };

  const handleImprimir = (id: string) => {
    navigate(`/liquidaciones/${id}/imprimir`);
  };

  const handleActualizarTarifaHabitual = async (trabajadorId: string, tarifa: number) => {
    const { error: rpcError } = await supabase.rpc('admin_actualizar_tarifa_hora_trabajador', {
      p_trabajador_id: trabajadorId,
      p_tarifa_hora: tarifa,
    });
    if (rpcError) {
      alert(parseErrorMessage(rpcError));
      return false;
    }
    await fetchTrabajadores();
    await fetchLiquidaciones();
    return true;
  };

  const toggleExpandedRow = (id: string) => {
    setExpandedId(prev => {
      const next = prev === id ? null : id;
      if (next && next !== prev) {
        // Load bonus when expanding
        fetchBonus(next);
      }
      return next;
    });
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
                                onClick={() => toggleExpandedRow(l.id)}
                                className="p-1.5 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                title={expandedId === l.id ? 'Ocultar detalle' : 'Ver detalle'}
                              >
                                <span className="material-symbols-outlined">{expandedId === l.id ? 'expand_less' : 'expand_more'}</span>
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
                              <button
                                onClick={() => handleImprimir(l.id)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                title="Imprimir / guardar PDF"
                              >
                                <span className="material-symbols-outlined">print</span>
                              </button>
                              <button
                                onClick={() => handleEliminar(l.id)}
                                disabled={l.estado === 'cerrada'}
                                className="p-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                title={l.estado === 'cerrada' ? 'Solo se pueden eliminar liquidaciones abiertas' : 'Eliminar liquidación'}
                              >
                                <span className="material-symbols-outlined">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expandedId === l.id && (
                          <tr key={`${l.id}-detail`}>
                            <td colSpan={11} className="px-5 py-4 bg-slate-50/70 dark:bg-slate-800/30">
                              <DetailPanel
                                key={`${l.id}-${l.actualizado_en}-${refreshKey}`}
                                liquidacion={l}
                                trabajadores={trabajadores}
                                bonusList={bonusMap[l.id] || []}
                                bonusLoading={bonusLoadingMap[l.id] || false}
                                onRefresh={async () => { await fetchLiquidaciones(); setRefreshKey(k => k + 1); }}
                                onRecalcular={handleRecalcular}
                                onCerrar={handleCerrar}
                                onActualizarTarifaHabitual={handleActualizarTarifaHabitual}
                                onLoadBonus={() => fetchBonus(l.id)}
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

// ─── Detail Panel ───────────────────────────────────────────────────────────
interface DetailPanelProps {
  liquidacion: Liquidacion;
  trabajadores: TrabajadorOption[];
  bonusList: LiquidacionBonus[];
  bonusLoading: boolean;
  onRefresh: () => Promise<void>;
  onRecalcular: (id: string) => Promise<void>;
  onCerrar: (id: string) => Promise<void>;
  onActualizarTarifaHabitual: (trabajadorId: string, tarifa: number) => Promise<boolean>;
  onLoadBonus: () => Promise<void>;
}

function DetailPanel({
  liquidacion,
  trabajadores,
  bonusList,
  bonusLoading,
  onRefresh,
  onRecalcular,
  onCerrar,
  onActualizarTarifaHabitual,
  onLoadBonus,
}: DetailPanelProps) {
  const isOpen = liquidacion.estado === 'abierta';

  const trabajador = useMemo(() => trabajadores.find(t => t.id === liquidacion.trabajador_id), [trabajadores, liquidacion.trabajador_id]);

  const capturedRate = liquidacion.tarifa_hora_capturada ?? liquidacion.tarifa_hora ?? null;

  const [usarTarifaPuntual, setUsarTarifaPuntual] = useState(liquidacion.usar_tarifa_puntual);
  const [tarifaHora, setTarifaHora] = useState<string>(() => {
    if (liquidacion.usar_tarifa_puntual) {
      return liquidacion.tarifa_hora?.toString() || '';
    }
    return capturedRate?.toString() || '';
  });
  const [useManualImporte, setUseManualImporte] = useState(liquidacion.importe_manual != null);
  const [importeManual, setImporteManual] = useState<string>(liquidacion.importe_manual?.toString() || '');
  const [importeNomina, setImporteNomina] = useState<string>(liquidacion.importe_nomina?.toString() || '');
  const [observaciones, setObservaciones] = useState(liquidacion.observaciones || '');
  const [saveLoading, setSaveLoading] = useState(false);
  const [isTarifaModalOpen, setIsTarifaModalOpen] = useState(false);
  const [tarifaHabitualInput, setTarifaHabitualInput] = useState('');

  const [bonusEdits, setBonusEdits] = useState<Record<string, Partial<LiquidacionBonus>>>({});

  const [newBonusConcepto, setNewBonusConcepto] = useState('');
  const [newBonusImporte, setNewBonusImporte] = useState('');
  const [newBonusOrdenId, setNewBonusOrdenId] = useState('');

  // El panel se re-monta mediante key para reflejar los datos actualizados tras
  // recalcular/guardar, por lo que los useState iniciales parten de la liquidación
  // más reciente.

  useEffect(() => {
    onLoadBonus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const guardarLiquidacion = async (): Promise<boolean> => {
    let p_tarifa_hora: number | null = null;
    if (usarTarifaPuntual) {
      const tarifaParsed = parseNumericInput(tarifaHora);
      if (tarifaParsed.error || tarifaParsed.value === null) {
        alert(tarifaParsed.error || 'La tarifa puntual es obligatoria cuando está activada.');
        return false;
      }
      p_tarifa_hora = tarifaParsed.value;
    }

    let p_importe_manual: number | null = null;
    if (useManualImporte) {
      const manualParsed = parseNumericInput(importeManual);
      if (manualParsed.error || manualParsed.value === null) {
        alert(manualParsed.error || 'El importe manual es obligatorio cuando está activado.');
        return false;
      }
      p_importe_manual = manualParsed.value;
    }

    const nominaParsed = parseNumericInput(importeNomina);
    if (nominaParsed.error) {
      alert(nominaParsed.error);
      return false;
    }

    const { error: rpcError } = await supabase.rpc('admin_update_liquidacion_v2', {
      p_liquidacion_id: liquidacion.id,
      p_usar_tarifa_puntual: usarTarifaPuntual,
      p_tarifa_hora: p_tarifa_hora,
      p_usar_importe_manual: useManualImporte,
      p_importe_manual: p_importe_manual,
      p_importe_nomina: nominaParsed.value ?? 0,
      p_set_observaciones: true,
      p_observaciones: observaciones || null,
    });

    if (rpcError) {
      alert(parseErrorMessage(rpcError));
      return false;
    }

    return true;
  };

  const handleGuardar = async () => {
    setSaveLoading(true);
    const ok = await guardarLiquidacion();
    if (ok) {
      await onRefresh();
    }
    setSaveLoading(false);
  };

  const handleRecalcularClick = async () => {
    setSaveLoading(true);
    const ok = await guardarLiquidacion();
    if (ok) {
      await onRecalcular(liquidacion.id);
    }
    setSaveLoading(false);
  };

  const handleToggleTarifaPuntual = (checked: boolean) => {
    setUsarTarifaPuntual(checked);
    if (!checked) {
      setTarifaHora(capturedRate?.toString() || '');
    } else {
      setTarifaHora(liquidacion.tarifa_hora?.toString() || '');
    }
  };

  const getBonusField = (bonus: LiquidacionBonus, field: keyof LiquidacionBonus) => {
    const edit = bonusEdits[bonus.id];
    if (!edit) return bonus[field];
    return edit[field] !== undefined ? edit[field] : bonus[field];
  };

  const updateBonusEdit = (id: string, field: keyof LiquidacionBonus, value: unknown) => {
    setBonusEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const handleGuardarBonus = async (bonus: LiquidacionBonus) => {
    const concepto = String(getBonusField(bonus, 'concepto')).trim();
    if (!concepto) {
      alert('El concepto del bonus es obligatorio.');
      return;
    }
    const importe = Number(getBonusField(bonus, 'importe'));
    if (Number.isNaN(importe) || importe < 0) {
      alert('El importe del bonus debe ser mayor o igual a 0.');
      return;
    }
    const ordenId = getBonusField(bonus, 'orden_id') as string | null;

    const { error: rpcError } = await supabase.rpc('admin_update_liquidacion_bonus', {
      p_bonus_id: bonus.id,
      p_set_concepto: true,
      p_concepto: concepto,
      p_set_importe: true,
      p_importe: importe,
      p_set_orden_id: true,
      p_orden_id: ordenId || null,
    });
    if (rpcError) {
      alert(parseErrorMessage(rpcError));
      return;
    }

    setBonusEdits(prev => {
      const next = { ...prev };
      delete next[bonus.id];
      return next;
    });
    await onLoadBonus();
    await onRefresh();
  };

  const handleEliminarBonus = async (bonusId: string) => {
    if (!window.confirm('¿Eliminar este bonus?')) return;
    const { error: rpcError } = await supabase.rpc('admin_eliminar_bonus', { p_bonus_id: bonusId });
    if (rpcError) {
      alert(parseErrorMessage(rpcError));
      return;
    }
    await onLoadBonus();
    await onRefresh();
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

    const { error: rpcError } = await supabase.rpc('admin_agregar_bonus', {
      p_liquidacion_id: liquidacion.id,
      p_concepto: newBonusConcepto.trim(),
      p_importe: bonusParsed.value,
      p_orden_id: newBonusOrdenId || null,
    });
    if (rpcError) {
      alert(parseErrorMessage(rpcError));
      return;
    }

    setNewBonusConcepto('');
    setNewBonusImporte('');
    setNewBonusOrdenId('');
    await onLoadBonus();
    await onRefresh();
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
            <div className="space-y-1 lg:col-span-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tarifa / hora</label>
                <button
                  onClick={() => { setIsTarifaModalOpen(true); setTarifaHabitualInput(''); }}
                  className="text-[10px] font-bold text-primary hover:text-primary/80 underline"
                  title="Editar tarifa habitual del trabajador"
                >
                  Editar habitual
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`tarifa-puntual-${liquidacion.id}`}
                  checked={usarTarifaPuntual}
                  onChange={e => handleToggleTarifaPuntual(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <label htmlFor={`tarifa-puntual-${liquidacion.id}`} className="text-sm text-slate-700 dark:text-slate-300">Usar tarifa puntual</label>
              </div>
              <input
                type="number"
                step="0.01"
                value={tarifaHora}
                disabled={!usarTarifaPuntual}
                onChange={e => setTarifaHora(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm h-10 px-3 focus:ring-2 focus:ring-primary outline-none disabled:opacity-50"
                placeholder={usarTarifaPuntual ? 'Tarifa puntual' : 'Tarifa capturada'}
              />
              {!usarTarifaPuntual && (
                <p className="text-[11px] text-slate-400">Usa la tarifa capturada al generar la liquidación.</p>
              )}
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
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Bonus</p>
              {bonusLoading && <p className="text-xs text-slate-400">Cargando bonus...</p>}
            </div>

            {bonusList.length > 0 && (
              <div className="space-y-2">
                {bonusList.map(b => (
                  <div key={b.id} className="flex flex-wrap items-end gap-2">
                    <input
                      type="text"
                      value={getBonusField(b, 'concepto') as string}
                      onChange={e => updateBonusEdit(b.id, 'concepto', e.target.value)}
                      className="flex-1 min-w-[150px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm h-9 px-3 focus:ring-2 focus:ring-primary outline-none"
                      placeholder="Concepto"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={getBonusField(b, 'importe') as number}
                      onChange={e => updateBonusEdit(b.id, 'importe', parseFloat(e.target.value) || 0)}
                      className="w-28 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm h-9 px-3 focus:ring-2 focus:ring-primary outline-none"
                      placeholder="Importe"
                    />
                    <input
                      type="text"
                      value={(getBonusField(b, 'orden_id') as string | null) || ''}
                      onChange={e => updateBonusEdit(b.id, 'orden_id', e.target.value || null)}
                      className="w-40 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm h-9 px-3 focus:ring-2 focus:ring-primary outline-none"
                      placeholder="Orden ID (opcional)"
                    />
                    <button
                      onClick={() => handleGuardarBonus(b)}
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
                    {b.orden_numero && (
                      <div className="w-full text-[11px] text-slate-400 -mt-1">
                        Orden: {b.orden_numero}{b.orden_descripcion ? ` – ${b.orden_descripcion}` : ''}
                      </div>
                    )}
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
              onClick={handleRecalcularClick}
              disabled={saveLoading}
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
              Cerrar
            </button>
          </div>

          {/* Modal: editar tarifa habitual del trabajador */}
          {isTarifaModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-xl shadow-2xl overflow-hidden">
                <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Tarifa habitual del trabajador</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    {trabajador ? `${trabajador.nombre} ${trabajador.apellidos || ''}`.trim() : 'Trabajador'}
                  </p>
                </div>
                <div className="p-5 space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nueva tarifa / hora habitual (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={tarifaHabitualInput}
                      onChange={e => setTarifaHabitualInput(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm h-10 px-3 focus:ring-2 focus:ring-primary outline-none"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Esta tarifa se aplicará a las nuevas liquidaciones que se generen. Las liquidaciones existentes no se verán afectadas.
                  </p>
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => setIsTarifaModalOpen(false)}
                      className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={async () => {
                        const parsed = parseNumericInput(tarifaHabitualInput);
                        if (parsed.error || parsed.value === null) {
                          alert(parsed.error || 'Introduce una tarifa válida.');
                          return;
                        }
                        const ok = await onActualizarTarifaHabitual(liquidacion.trabajador_id, parsed.value);
                        if (ok) setIsTarifaModalOpen(false);
                      }}
                      className="px-4 py-2 text-sm font-bold bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 p-4 rounded-xl text-sm flex items-center justify-between">
          <span>Liquidación cerrada. Solo lectura.</span>
        </div>
      )}
    </div>
  );
}
