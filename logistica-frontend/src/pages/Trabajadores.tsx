import { useState, useEffect } from 'react';
import AltaTrabajadorModal from '../components/modals/AltaTrabajadorModal';
import EditarTrabajadorModal from '../components/modals/EditarTrabajadorModal';
import CrearAccesoModal from '../components/modals/CrearAccesoModal';
import { supabase } from '../lib/supabase';

export default function Trabajadores() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAccesoModalOpen, setIsAccesoModalOpen] = useState(false);
  const [trabajadorToEdit, setTrabajadorToEdit] = useState<any>(null);
  const [trabajadorAcceso, setTrabajadorAcceso] = useState<any>(null);
  const [trabajadores, setTrabajadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    enObra: 0,
    pctActiva: 0,
    demandaEspecialidad: '---',
    demandaCount: 0
  });

  useEffect(() => {
     fetchTrabajadores();
  }, []);

  const fetchTrabajadores = async () => {
      setLoading(true);
      
      // Fetch trabajadores
      const { data: workerData, error: workerErr } = await supabase
        .from('trabajadores')
        .select('*')
        .order('creado_en', { ascending: false });
      
      // Fetch all perfiles to get tarifa_hora
      const { data: profileData } = await supabase
        .from('perfiles')
        .select('id, tarifa_hora');

      if (!workerErr && workerData) {
          // Merge profile info (tarifa_hora) into worker data
          const enriched = workerData.map(w => {
              const profile = profileData?.find(p => p.id === w.auth_user_id);
              return {
                  ...w,
                  tarifa_hora: profile?.tarifa_hora || 0
              };
          });
          
          setTrabajadores(enriched);
          calculateBasicStats(enriched);
          fetchDemandStats(enriched);
      }
      setLoading(false);
  };

  const calculateBasicStats = (list: any[]) => {
      const enObra = list.filter(t => t.estado === 'En Obra').length;
      const pct = list.length > 0 ? Math.round((enObra / list.length) * 100) : 0;
      setStats(prev => ({ ...prev, enObra, pctActiva: pct }));
  };

  const fetchDemandStats = async (workers: any[]) => {
      const today = new Date().toISOString().split('T')[0];
      const { data: reports } = await supabase
          .from('reportes')
          .select('tecnico_id')
          .gte('creado_en', today);
      
      if (reports && reports.length > 0) {
          const counts: Record<string, number> = {};
          reports.forEach(r => {
              const worker = workers.find(w => w.auth_user_id === r.tecnico_id || w.id === r.tecnico_id);
              if (worker && worker.especialidad) {
                  counts[worker.especialidad] = (counts[worker.especialidad] || 0) + 1;
              }
          });

          const entries = Object.entries(counts);
          if (entries.length > 0) {
              entries.sort((a,b) => b[1] - a[1]);
              setStats(prev => ({ 
                  ...prev, 
                  demandaEspecialidad: entries[0][0], 
                  demandaCount: entries[0][1] 
              }));
          }
      }
  };

  const handleDelete = async (id: string) => {
      if (window.confirm('¿Estás seguro de que deseas borrar este trabajador? Se desvinculará de sus órdenes.')) {
          const { error } = await supabase.from('trabajadores').delete().eq('id', id);
          if (!error) {
              fetchTrabajadores();
          } else {
              console.error('Error deleting:', error);
              alert('Error al borrar el trabajador.');
          }
      }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 h-full">
      {/* Header */}
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 shrink-0 sticky top-0 z-10 w-full">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold">Gestión de Trabajadores</h2>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button 
             onClick={() => setIsAddModalOpen(true)}
             className="bg-primary text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-primary/90 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined">person_add</span>
            Añadir Trabajador
          </button>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8 max-w-7xl mx-auto w-full">
        
        {/* Filters & Search */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex-1 min-w-[300px] max-w-md relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">search</span>
            <input 
               className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all shadow-sm text-sm" 
               placeholder="Buscar por nombre o especialidad..." 
               type="text"
            />
          </div>
          <div className="flex items-center gap-3">
             <select className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm font-medium">
               <option>Todas las Especialidades</option>
             </select>
             <select className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm font-medium">
               <option>Todos los Estados</option>
               <option>Disponible</option>
               <option>En Obra</option>
             </select>
          </div>
        </div>

        {/* Workers Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm w-full">
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse min-w-[900px]">
               <thead>
                 <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                   <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trabajador</th>
                   <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Especialidad</th>
                   <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                   <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Rendimiento</th>
                   <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                     <tr><td colSpan={5} className="text-center py-8">Cargando trabajadores...</td></tr>
                  ) : trabajadores.length === 0 ? (
                     <tr><td colSpan={5} className="text-center py-8">No hay trabajadores registrados.</td></tr>
                  ) : (
                     trabajadores.map(trabajador => (
                        <tr key={trabajador.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold uppercase">{trabajador.nombre?.charAt(0)}{trabajador.apellidos?.charAt(0)}</div>
                                 <p className="font-bold text-sm">{trabajador.nombre} {trabajador.apellidos}</p>
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-full border border-slate-200 capitalize">{trabajador.especialidad}</span>
                           </td>
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                 <span className={`w-2 h-2 rounded-full ${trabajador.estado === 'Disponible' ? 'bg-emerald-500' : (trabajador.estado === 'En Obra' ? 'bg-amber-500' : 'bg-rose-500')}`}></span>
                                 <span className="text-sm font-medium">{trabajador.estado}</span>
                              </div>
                           </td>
                           <td className="px-6 py-4 text-center">
                              <span className="text-amber-500 font-bold text-sm">5.0 ⭐</span>
                           </td>
                           <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button onClick={() => { setTrabajadorAcceso(trabajador); setIsAccesoModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-emerald-500" title="Accesos"><span className="material-symbols-outlined text-[18px]">key</span></button>
                                <button onClick={() => { setTrabajadorToEdit(trabajador); setIsEditModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-sky-500" title="Editar"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                                <button onClick={() => handleDelete(trabajador.id)} className="p-1.5 text-slate-400 hover:text-red-500" title="Borrar"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                              </div>
                           </td>
                        </tr>
                     ))
                  )}
               </tbody>
             </table>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0"><span className="material-symbols-outlined">groups</span></div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Plantilla</p>
              <h3 className="text-2xl font-black">{trabajadores.length}</h3>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-600 shrink-0"><span className="material-symbols-outlined">construction</span></div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">En Obra Ahora</p>
              <h3 className="text-2xl font-black">{stats.enObra}</h3>
              <p className="text-xs text-slate-500 mt-1">{stats.pctActiva}% de la plantilla activa</p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-600 shrink-0"><span className="material-symbols-outlined">electric_bolt</span></div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Más Demanda</p>
              <h3 className="text-2xl font-black capitalize">{stats.demandaEspecialidad}</h3>
              <p className="text-xs text-slate-500 mt-1">{stats.demandaCount} reportes hoy</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modals */}
      <AltaTrabajadorModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onCreated={fetchTrabajadores} />
      {trabajadorToEdit && <EditarTrabajadorModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onUpdated={fetchTrabajadores} trabajadorData={trabajadorToEdit} />}
      {trabajadorAcceso && <CrearAccesoModal isOpen={isAccesoModalOpen} onClose={() => setIsAccesoModalOpen(false)} onCreated={fetchTrabajadores} trabajador={trabajadorAcceso} />}
    </div>
  );
}
