import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import NuevoReporteModal from '../components/modals/NuevoReporteModal';

export default function Ordenes() {
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterTecnico, setFilterTecnico] = useState('');
  const [filterFecha, setFilterFecha] = useState('');

  useEffect(() => {
    fetchOrdenes();
    fetchTecnicos();
  }, []);

  const fetchOrdenes = async () => {
    const { data, error } = await supabase
      .from('ordenes')
      .select('*, reportes(tecnico_id)')
      .neq('estado', 'Archivado')
      .order('creado_en', { ascending: false });

    if (!error && data) {
      setOrdenes(data);
    }
    setLoading(false);
  };

  const fetchTecnicos = async () => {
    const { data } = await supabase.from('trabajadores').select('auth_user_id, nombre, apellidos');
    if (data) setTecnicos(data);
  };

  // Filter logic
  const filteredOrdenes = ordenes.filter((o: any) => {
    const matchesSearch = !searchTerm || 
        o.id_legible?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        o.cliente?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstado = !filterEstado || o.estado === filterEstado;
    
    // Check main tech OR any tech who submitted a report
    const matchesTecnico = !filterTecnico || 
        o.tecnico_id === filterTecnico || 
        (o.reportes && o.reportes.some((r: any) => r.tecnico_id === filterTecnico));
        
    const matchesFecha = !filterFecha || o.creado_en?.startsWith(filterFecha);
    
    return matchesSearch && matchesEstado && matchesTecnico && matchesFecha;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setFilterEstado('');
    setFilterTecnico('');
    setFilterFecha('');
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50 dark:bg-slate-900 w-full">
      <header className="h-16 flex items-center justify-between px-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 w-full">
        <div>
           <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
             <span className="material-symbols-outlined text-primary">assignment</span>
             Directorio de Órdenes
           </h2>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-sm shadow-primary/30"
        >
          <span className="material-symbols-outlined">add</span> Nueva Orden
        </button>
      </header>
      
      <NuevoReporteModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={fetchOrdenes}
      />
      
      <div className="p-8 max-w-7xl mx-auto w-full space-y-4">
        
        {/* FILTERS BAR */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px] relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-[20px]">search</span>
                <input 
                    type="text" 
                    placeholder="Buscar por ID u orden..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-white"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="flex items-center gap-2">
                <select 
                    className="pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-primary/20 outline-none"
                    value={filterEstado}
                    onChange={e => setFilterEstado(e.target.value)}
                >
                    <option value="">-- Todos los Estados --</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="Urgente">Urgente</option>
                    <option value="En Curso">En Curso</option>
                    <option value="En revisión">En revisión</option>
                    <option value="Pendiente de firma">Pendiente de firma</option>
                    <option value="Finalizada">Finalizada</option>
                </select>

                <select 
                    className="pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-primary/20 outline-none"
                    value={filterTecnico}
                    onChange={e => setFilterTecnico(e.target.value)}
                >
                    <option value="">-- Todos los Técnicos --</option>
                    {tecnicos.map((t: any) => (
                        <option key={t.auth_user_id} value={t.auth_user_id}>{t.nombre} {t.apellidos}</option>
                    ))}
                </select>

                <input 
                    type="date" 
                    className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-primary/20 outline-none"
                    value={filterFecha}
                    onChange={e => setFilterFecha(e.target.value)}
                />

                {(searchTerm || filterEstado || filterTecnico || filterFecha) && (
                    <button 
                        onClick={clearFilters}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                        title="Limpiar filtros"
                    >
                        <span className="material-symbols-outlined text-[20px]">filter_alt_off</span>
                    </button>
                )}
            </div>
        </div>

        <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold tracking-wider uppercase text-[10px]">
              <tr>
                <th className="px-6 py-4 rounded-tl-xl">ID OT</th>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Servicio</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <th className="px-6 py-4 text-right rounded-tr-xl">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">Cargando órdenes desde Supabase...</td></tr>
              ) : filteredOrdenes.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">No se encontraron órdenes con los filtros aplicados.</td></tr>
              ) : (
                filteredOrdenes.map((orden: any) => (
                  <tr key={orden.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                        <Link to={`/ordenes/${orden.id}`} className="hover:text-primary transition-colors underline decoration-transparent group-hover:decoration-primary/30">{orden.id_legible}</Link>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium whitespace-nowrap">
                        {new Date(orden.creado_en).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' })}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">{orden.cliente}</td>
                    <td className="px-6 py-4 text-slate-500 max-w-xs truncate">{orden.descripcion || 'Sin servicio específico'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        orden.estado === 'Urgente' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        orden.estado === 'En revisión' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                        orden.estado === 'Pendiente de firma' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                        orden.estado === 'Pendiente' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-500' :
                        orden.estado === 'En Curso' ? 'bg-primary/10 text-primary' :
                        orden.estado === 'Finalizada' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-500' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {orden.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link to={`/ordenes/${orden.id}`} className="text-slate-400 hover:text-primary transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg p-2 inline-flex items-center justify-center">
                        <span className="material-symbols-outlined text-lg">visibility</span>
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
  );
}
