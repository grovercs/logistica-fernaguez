import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ClipboardList, Plus, Search, Filter, X } from 'lucide-react';
import NuevoReporteModal from '../components/modals/NuevoReporteModal';
import { notifyNewOrder } from '../lib/whatsapp';

export default function Ordenes() {
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tecnicos, setTecnicos] = useState<any[]>([]);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterTecnico, setFilterTecnico] = useState('');
  const [filterFecha, setFilterFecha] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    fetchOrdenes();
    fetchTecnicos();
  }, []);

  const fetchOrdenes = async () => {
    setLoading(true);
    // 1. Cargamos las órdenes
    const { data: rawOrdenes, error } = await supabase
      .from('ordenes')
      .select('*')
      .neq('estado', 'Archivado')
      .order('creado_en', { ascending: false, nullsFirst: false });

    // 2. Cargamos los técnicos para poder cruzar los datos
    const { data: rawTecnicos } = await supabase
      .from('trabajadores')
      .select('id, auth_user_id, nombre, apellidos, telefono');

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
    const { data } = await supabase.from('trabajadores').select('id, auth_user_id, nombre, apellidos, telefono');
    setTecnicos(data || []);
  };

  const filteredOrdenes = ordenes.filter(o => {
    const searchLower = searchTerm.toLowerCase();
    
    // Búsqueda más robusta (ID, Cliente, Dirección, etc.)
    const matchesSearch = searchTerm === '' || 
      (o.id_legible && o.id_legible.toLowerCase().includes(searchLower)) || 
      (o.cliente && o.cliente.toLowerCase().includes(searchLower)) ||
      (o.direccion && o.direccion.toLowerCase().includes(searchLower));
      
    const matchesEstado = filterEstado === '' || o.estado === filterEstado;
    const matchesTecnico = filterTecnico === '' || o.tecnico_id === filterTecnico;
    const matchesFecha = filterFecha === '' || (o.fecha_programada && o.fecha_programada.startsWith(filterFecha));
    
    return matchesSearch && matchesEstado && matchesTecnico && matchesFecha;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setFilterEstado('');
    setFilterTecnico('');
    setFilterFecha('');
  };

  const handleManualWhatsApp = async (orden: any) => {
    if (!orden.tecnico_id) {
      alert("Asigna un técnico primero para enviar la notificación.");
      return;
    }

    // Buscamos el técnico por cualquiera de sus IDs (interno o auth)
    const selectedTecnico = tecnicos.find(t => t.id === orden.tecnico_id || t.auth_user_id === orden.tecnico_id);
    if (!selectedTecnico || !selectedTecnico.telefono) {
      alert("El técnico asignado no tiene un teléfono configurado.");
      return;
    }

    setLoading(true);
    try {
      const result = await notifyNewOrder(selectedTecnico.telefono, {
        id: orden.id,
        id_legible: orden.id_legible,
        cliente: orden.cliente,
        direccion: orden.direccion,
        descripcion: orden.descripcion
      });

      if (result.sent === "true" || result.success) {
        alert("✅ Notificación enviada a " + selectedTecnico.nombre);
      } else {
        alert("⚠️ Revisa el panel de UltraMsg, el mensaje no se pudo confirmar.");
      }
    } catch (err) {
      console.error(err);
      alert("❌ Error al conectar con WhatsApp.");
    }
    setLoading(false);
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
            <button 
                onClick={() => setIsModalOpen(true)}
                className="w-full sm:w-auto bg-primary text-white px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
                <Plus className="size-5" />
                Nueva Orden
            </button>
        </div>
      </div>

      <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
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
                </select>

                <select 
                    className="w-full lg:w-48 pl-4 pr-8 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer"
                    value={filterTecnico}
                    onChange={e => setFilterTecnico(e.target.value)}
                >
                    <option value="">Técnico</option>
                    {tecnicos.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                </select>

                <input 
                    type="date" 
                    className="w-full lg:w-40 px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-black text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-primary/20 outline-none"
                    value={filterFecha}
                    onChange={e => setFilterFecha(e.target.value)}
                />

                {(searchTerm || filterEstado || filterTecnico || filterFecha) && (
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
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                            orden.estado === 'Urgente' ? 'bg-red-100 text-red-700 dark:bg-red-900/30' :
                            orden.estado === 'En revisión' ? 'bg-purple-100 text-purple-700' :
                            orden.estado === 'Pendiente de firma' ? 'bg-orange-100 text-orange-700' :
                            orden.estado === 'Pendiente' ? 'bg-amber-100 text-amber-700' :
                            orden.estado === 'En Curso' ? 'bg-blue-100 text-blue-700' :
                            orden.estado === 'Finalizada' ? 'bg-green-100 text-green-700' :
                            'bg-slate-100 text-slate-600'
                        }`}>
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
                          {orden.tecnico_id && (
                            <button 
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleManualWhatsApp(orden);
                                }}
                                className="size-9 rounded-xl bg-green-100 text-green-600 hover:bg-green-200 transition-all inline-flex items-center justify-center"
                                title="Re-notificar WhatsApp"
                            >
                                <span className="material-symbols-outlined text-[18px]">chat</span>
                            </button>
                          )}
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
    </div>
  );
}
