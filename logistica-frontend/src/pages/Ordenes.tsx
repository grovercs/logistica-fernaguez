import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ClipboardList, Plus, Search, Filter, X, ChevronDown, User } from 'lucide-react';
import NuevoReporteModal from '../components/modals/NuevoReporteModal';
import RenotificarModal from '../components/modals/RenotificarModal';

export default function Ordenes() {
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRenotificarOpen, setIsRenotificarOpen] = useState(false);
  const [ordenParaRenotificar, setOrdenParaRenotificar] = useState<any>(null);
  const [tecnicos, setTecnicos] = useState<any[]>([]);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterTecnico, setFilterTecnico] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showWorkerMenu, setShowWorkerMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'activas' | 'archivadas'>('activas');

  useEffect(() => {
    fetchOrdenes();
    fetchTecnicos();
  }, [activeTab]);

  const fetchOrdenes = async () => {
    setLoading(true);
    // 1. Cargamos las órdenes
    let query = supabase
      .from('ordenes')
      .select('*')
      .order('creado_en', { ascending: false, nullsFirst: false });

    if (activeTab === 'activas') {
      query = query.neq('estado', 'Archivado');
    } else {
      query = query.eq('estado', 'Archivado');
    }

    const { data: rawOrdenes, error } = await query;

    // 2. Cargamos los técnicos para poder cruzar los datos
    const { data: rawTecnicos } = await supabase
      .from('trabajadores')
      .select('id, auth_user_id, nombre, apellidos, telefono, telegram_chat_id');

    if (!error && rawOrdenes) {
      // 3. Cruzamos los datos manualmente (más fiable si no hay FKs en BD)
      const mergedData = rawOrdenes.map(orden => {
        // Buscamos al técnico por su ID o por su AuthID (por si acaso hay mezclas)
        const tecnicoObj = rawTecnicos?.find(t => t.id === orden.tecnico_id || t.auth_user_id === orden.tecnico_id);
        return {
          ...orden,
          tecnico: tecnicoObj 
        };
      });

      // Ordenación estricta por fecha
      mergedData.sort((a, b) => {
        const timeA = a.creado_en ? new Date(a.creado_en).getTime() : 0;
        const timeB = b.creado_en ? new Date(b.creado_en).getTime() : 0;
        return timeB - timeA;
      });

      setOrdenes(mergedData);
    }
    setLoading(false);
  };

  const fetchTecnicos = async () => {
    const { data } = await supabase.from('trabajadores').select('id, auth_user_id, nombre, apellidos, telefono, telegram_chat_id');
    setTecnicos(data || []);
  };

  const statusPriority: Record<string, number> = {
    'Urgente': 1,
    'En Curso': 2,
    'Pendiente de firma': 3,
    'En revisión': 4,
    'Pendiente': 5,
    'Finalizada': 6,
    'Cancelada': 7,
    'Archivado': 8,
  };

  const filteredOrdenes = ordenes.filter(o => {
    const searchLower = searchTerm.toLowerCase();

    const matchesSearch = searchTerm === '' ||
      (o.id_legible && o.id_legible.toLowerCase().includes(searchLower)) ||
      (o.cliente && o.cliente.toLowerCase().includes(searchLower)) ||
      (o.direccion && o.direccion.toLowerCase().includes(searchLower));

    const matchesEstado = filterEstado === '' || o.estado === filterEstado;
    const matchesTecnico = filterTecnico === '' || o.tecnico_id === filterTecnico || tecnicos.find(t => t.id === filterTecnico)?.auth_user_id === o.tecnico_id;
    let matchesFecha = true;
    if (fechaDesde || fechaHasta) {
      const ordenDate = o.fecha_programada || o.creado_en;
      if (!ordenDate) { matchesFecha = false; }
      else {
        const d = new Date(ordenDate);
        const dStr = d.toISOString().split('T')[0];
        if (fechaDesde && dStr < fechaDesde) matchesFecha = false;
        if (fechaHasta && dStr > fechaHasta) matchesFecha = false;
      }
    }

    return matchesSearch && matchesEstado && matchesTecnico && matchesFecha;
  }).sort((a, b) => {
    const prioA = statusPriority[a.estado] || 99;
    const prioB = statusPriority[b.estado] || 99;
    if (prioA !== prioB) return prioA - prioB;
    const timeA = a.creado_en ? new Date(a.creado_en).getTime() : 0;
    const timeB = b.creado_en ? new Date(b.creado_en).getTime() : 0;
    return timeB - timeA;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setFilterEstado('');
    setFilterTecnico('');
    setFechaDesde('');
    setFechaHasta('');
  };

  const applyDatePreset = (preset: string) => {
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    const toISO = (d: Date) => d.toISOString().split('T')[0];

    switch (preset) {
      case 'hoy':
        setFechaDesde(`${yyyy}-${mm}-${dd}`);
        setFechaHasta(`${yyyy}-${mm}-${dd}`);
        break;
      case 'ayer': {
        const ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1);
        const a = toISO(ayer);
        setFechaDesde(a); setFechaHasta(a);
        break;
      }
      case 'semana': {
        const inicio = new Date(hoy);
        const dow = inicio.getDay();
        const diff = dow === 0 ? -6 : 1 - dow;
        inicio.setDate(hoy.getDate() + diff);
        setFechaDesde(toISO(inicio));
        setFechaHasta(`${yyyy}-${mm}-${dd}`);
        break;
      }
      case 'semana_pasada': {
        const fin = new Date(hoy);
        const dow2 = fin.getDay();
        const diff2 = dow2 === 0 ? 0 : 7 - dow2;
        fin.setDate(hoy.getDate() - diff2 - 1);
        const ini = new Date(fin); ini.setDate(fin.getDate() - 6);
        setFechaDesde(toISO(ini)); setFechaHasta(toISO(fin));
        break;
      }
      case 'mes': {
        setFechaDesde(`${yyyy}-${mm}-01`);
        setFechaHasta(`${yyyy}-${mm}-${dd}`);
        break;
      }
      case 'mes_pasado': {
        const mp = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
        const mpEnd = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
        setFechaDesde(toISO(mp)); setFechaHasta(toISO(mpEnd));
        break;
      }
      case '7dias': {
        const d7 = new Date(hoy); d7.setDate(hoy.getDate() - 6);
        setFechaDesde(toISO(d7)); setFechaHasta(`${yyyy}-${mm}-${dd}`);
        break;
      }
      case '30dias': {
        const d30 = new Date(hoy); d30.setDate(hoy.getDate() - 29);
        setFechaDesde(toISO(d30)); setFechaHasta(`${yyyy}-${mm}-${dd}`);
        break;
      }
      default:
        setFechaDesde(''); setFechaHasta('');
    }
  };

  const openRenotificar = (orden: any) => {
    setOrdenParaRenotificar(orden);
    setIsRenotificarOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col w-full min-h-screen bg-slate-50/50 dark:bg-slate-950/20">
      {/* Header Responsivo */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                    <ClipboardList className="size-6" />
                </div>
                <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">Órdenes de Trabajo</h1>
                    <p className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-widest">{filteredOrdenes.length} Intervenciones Registradas</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Dropdown filtro por trabajador */}
              <div className="relative">
                <button
                  onClick={() => setShowWorkerMenu(!showWorkerMenu)}
                  className="w-full sm:w-auto bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-3.5 rounded-2xl font-bold text-xs shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                >
                  <User className="size-4" />
                  <span className="hidden sm:inline">{filterTecnico ? tecnicos.find(t => t.id === filterTecnico)?.nombre || 'Técnico' : 'Filtrar por Técnico'}</span>
                  <span className="sm:hidden">Técnico</span>
                  <ChevronDown className={`size-3 transition-transform ${showWorkerMenu ? 'rotate-180' : ''}`} />
                </button>

                {showWorkerMenu && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowWorkerMenu(false)} />
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-40 overflow-hidden">
                      <div className="p-2 max-h-72 overflow-y-auto">
                        <button
                          onClick={() => { setFilterTecnico(''); setShowWorkerMenu(false); }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${filterTecnico === '' ? 'bg-primary/10 text-primary' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        >
                          <span className="size-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[10px] font-black">T</span>
                          Todos los técnicos
                        </button>
                        {tecnicos.map((t: any) => (
                          <button
                            key={t.id}
                            onClick={() => { setFilterTecnico(t.id); setShowWorkerMenu(false); }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${filterTecnico === t.id ? 'bg-primary/10 text-primary' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                          >
                            <span className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black uppercase">{t.nombre?.charAt(0)}</span>
                            {t.nombre} {t.apellidos}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full sm:w-auto bg-primary text-white px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="size-5" />
                Nueva Orden
              </button>
            </div>
        </div>
      </div>

      <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Tabs Activas / Archivadas */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('activas')}
            className={`px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${
              activeTab === 'activas'
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Activas
          </button>
          <button
            onClick={() => setActiveTab('archivadas')}
            className={`px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${
              activeTab === 'archivadas'
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Archivadas
          </button>
        </div>

        {/* Barra de Filtros Responsiva */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row items-center gap-4">
            {/* Buscador */}
            <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
                <input 
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-slate-400"
                    placeholder="Buscar por ID u orden o nombre del cliente..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Toggle Filtros Móvil */}
            <button 
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="lg:hidden w-full flex items-center justify-center gap-2 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm font-bold text-slate-600"
            >
                <Filter className="size-4" />
                {showMobileFilters ? 'Ocultar Filtros' : 'Más Filtros'}
            </button>

            {/* Selects de Filtros */}
            <div className={`
                ${showMobileFilters ? 'flex' : 'hidden'} lg:flex 
                flex-col lg:flex-row items-center gap-3 w-full lg:w-auto
            `}>
                <select 
                    className="w-full lg:w-48 pl-4 pr-8 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer"
                    value={filterEstado}
                    onChange={e => setFilterEstado(e.target.value)}
                >
                    <option value="">Estado</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="Urgente">Urgente</option>
                    <option value="En Curso">En Curso</option>
                    <option value="En revisión">En revisión</option>
                    <option value="Pendiente de firma">Pendiente de firma</option>
                    <option value="Finalizada">Finalizada</option>
                    <option value="Cancelada">Cancelada</option>
                </select>

                <select
                    className="w-full lg:w-48 pl-4 pr-8 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer"
                    value={filterTecnico}
                    onChange={e => setFilterTecnico(e.target.value)}
                >
                    <option value="">Técnico</option>
                    {tecnicos.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.nombre} {t.apellidos}</option>
                    ))}
                </select>

                {/* Rango de Fechas Profesional */}
                <div className="w-full lg:w-auto flex flex-col gap-2">
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-xl p-1.5">
                    <div className="flex items-center gap-1.5 px-2">
                      <span className="material-symbols-outlined text-slate-400 text-[16px]">calendar_today</span>
                      <input
                        type="date"
                        className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none w-28"
                        value={fechaDesde}
                        onChange={e => setFechaDesde(e.target.value)}
                        placeholder="Desde"
                      />
                    </div>
                    <span className="text-slate-300 text-[10px]">→</span>
                    <div className="flex items-center gap-1.5 px-2">
                      <input
                        type="date"
                        className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none w-28"
                        value={fechaHasta}
                        onChange={e => setFechaHasta(e.target.value)}
                        placeholder="Hasta"
                      />
                      <span className="material-symbols-outlined text-slate-400 text-[16px]">calendar_today</span>
                    </div>
                  </div>
                  {/* Presets rápidos */}
                  <div className="flex flex-wrap gap-1">
                    {[
                      { key: 'hoy', label: 'Hoy' },
                      { key: 'ayer', label: 'Ayer' },
                      { key: '7dias', label: '7 días' },
                      { key: 'semana', label: 'Esta semana' },
                      { key: 'semana_pasada', label: 'Sem. pasada' },
                      { key: 'mes', label: 'Este mes' },
                      { key: 'mes_pasado', label: 'Mes pasado' },
                      { key: '30dias', label: '30 días' },
                    ].map((preset) => (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => applyDatePreset(preset.key)}
                        className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-colors ${
                          (preset.key === 'hoy' && fechaDesde === fechaHasta && fechaDesde === new Date().toISOString().split('T')[0]) ||
                          (preset.key !== 'hoy' && false) // Simplified active state
                            ? 'bg-primary text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {(searchTerm || filterEstado || filterTecnico || fechaDesde || fechaHasta) && (
                    <button
                        onClick={clearFilters}
                        className="w-full lg:w-auto p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all flex items-center justify-center"
                        title="Limpiar filtros"
                    >
                        <X className="size-5" />
                        <span className="lg:hidden ml-2 font-bold text-xs uppercase tracking-widest">Limpiar</span>
                    </button>
                )}
            </div>
        </div>

        {/* Listado de Órdenes (Tabla Responsiva) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-full">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-black tracking-widest uppercase text-[10px]">
                <tr>
                    <th className="px-4 sm:px-6 py-5">ID OT</th>
                    <th className="px-4 sm:px-6 py-5">Intervención</th>
                    <th className="px-4 sm:px-6 py-5">Cliente / Dirección</th>
                    <th className="px-4 sm:px-6 py-5">Técnico</th>
                    <th className="px-4 sm:px-6 py-5 text-center">Estado</th>
                    <th className="px-4 sm:px-6 py-5">Creado</th>
                    <th className="px-4 sm:px-6 py-5 text-right">Acción</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                    <tr><td colSpan={8} className="px-6 py-20 text-center text-slate-400 font-bold animate-pulse">Consultando base de datos...</td></tr>
                ) : filteredOrdenes.length === 0 ? (
                    <tr><td colSpan={8} className="px-6 py-20 text-center text-slate-400 font-medium italic">No se encontraron resultados</td></tr>
                ) : (
                    filteredOrdenes.map((orden: any) => (
                    <tr key={orden.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                        <td className="px-4 sm:px-6 py-5">
                            <Link to={`/ordenes/${orden.id}`} className="font-black text-slate-900 dark:text-white hover:text-primary transition-colors whitespace-nowrap">
                                {orden.id_legible}
                            </Link>
                        </td>
                        <td className="px-4 sm:px-6 py-5 text-slate-500 font-bold whitespace-nowrap">
                            {orden.fecha_programada ? new Date(orden.fecha_programada).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) : '---'}
                        </td>
                        <td className="px-4 sm:px-6 py-5">
                            <div className="font-bold text-slate-700 dark:text-slate-200 truncate max-w-[150px] sm:max-w-[250px]">{orden.cliente}</div>
                            <div className="text-[11px] text-slate-400 font-medium mt-0.5">{orden.direccion || 'Sin dirección'}</div>
                        </td>
                        <td className="px-4 sm:px-6 py-5">
                            {(() => {
                                const t = Array.isArray(orden.tecnico) ? orden.tecnico[0] : orden.tecnico;
                                if (!t) return <span className="text-xs text-slate-300 italic">No asignado</span>;
                                return (
                                    <div className="flex items-center gap-2">
                                        <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black uppercase">
                                            {t.nombre?.charAt(0)}
                                        </div>
                                        <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                                            {t.nombre}
                                        </span>
                                    </div>
                                );
                            })()}
                        </td>
                        <td className="px-4 sm:px-6 py-5 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1 ${
                            orden.estado === 'Urgente' ? 'bg-red-100 text-red-700 dark:bg-red-900/30' :
                            orden.estado === 'En revisión' ? 'bg-purple-100 text-purple-700' :
                            orden.estado === 'Pendiente de firma' ? 'bg-orange-100 text-orange-700' :
                            orden.estado === 'Pendiente' ? 'bg-amber-100 text-amber-700' :
                            orden.estado === 'En Curso' ? 'bg-blue-100 text-blue-700' :
                            orden.estado === 'Finalizada' ? 'bg-green-100 text-green-700' :
                            'bg-slate-100 text-slate-600'
                        }`}>
                            {orden.estado === 'Urgente' && <span className="material-symbols-outlined text-[10px]">warning</span>}
                            {orden.estado}
                        </span>
                        </td>
                        <td className="px-4 sm:px-6 py-5 text-slate-400 text-[10px] font-bold">
                            {(() => {
                                const diff = new Date().getTime() - new Date(orden.creado_en).getTime();
                                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                                if (days === 0) return 'Hoy';
                                if (days === 1) return 'Ayer';
                                if (days < 0) return 'Recién';
                                return `${days}d`;
                            })()}
                        </td>
                        <td className="px-4 sm:px-6 py-5 text-right">
                          {<button
                                onClick={(e) => {
                                    e.preventDefault();
                                    openRenotificar(orden);
                                }}
                                className="size-9 rounded-xl bg-green-100 text-green-600 hover:bg-green-200 transition-all inline-flex items-center justify-center"
                                title="Re-notificar al técnico"
                            >
                                <span className="material-symbols-outlined text-[18px]">chat</span>
                            </button>
                          }
                          <Link to={`/ordenes/${orden.id}`} className="size-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-primary hover:bg-primary/10 transition-all inline-flex items-center justify-center">
                              <Search className="size-4" />
                          </Link>
                        </td>
                    </tr>
                    ))
                )}
                </tbody>
            </table>
          </div>
        </div>
      </div>

      <NuevoReporteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={fetchOrdenes}
      />

      <RenotificarModal
        isOpen={isRenotificarOpen}
        onClose={() => setIsRenotificarOpen(false)}
        orden={ordenParaRenotificar}
      />
    </div>
  );
}
