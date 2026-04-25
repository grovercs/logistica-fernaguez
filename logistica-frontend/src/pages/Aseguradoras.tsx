import { useState, useEffect } from 'react';
import AltaAseguradoraModal from '../components/modals/AltaAseguradoraModal';
import EditarAseguradoraModal from '../components/modals/EditarAseguradoraModal';
import { supabase } from '../lib/supabase';

export default function Aseguradoras() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [aseguradoraToEdit, setAseguradoraToEdit] = useState<any>(null);
  const [aseguradoras, setAseguradoras] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    intervencionesActivas: 0,
    tasaResolucion: 0
  });

  useEffect(() => {
     fetchAseguradoras();
     fetchStats();
  }, []);

  const fetchAseguradoras = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('aseguradoras').select('*').order('creado_en', { ascending: false });
      if (!error && data) setAseguradoras(data);
      setLoading(false);
  };

  const fetchStats = async () => {
      // Get all active orders (non-archived)
      const { data, error } = await supabase
          .from('ordenes')
          .select('estado')
          .not('estado', 'eq', 'Archivado');
      
      if (!error && data) {
          const total = data.length;
          const finalizadas = data.filter(o => o.estado === 'Finalizada').length;
          const tasa = total > 0 ? (finalizadas / total) * 100 : 0;
          
          setStats({
              intervencionesActivas: total,
              tasaResolucion: Math.round(tasa * 10) / 10
          });
      }
  };

  const handleDelete = async (id: string) => {
      if (window.confirm('¿Estás seguro de que deseas borrar este cliente?')) {
          const { error } = await supabase.from('aseguradoras').delete().eq('id', id);
          if (!error) {
              fetchAseguradoras();
          } else {
              console.error('Error deleting:', error);
              alert('Error al borrar el cliente.');
          }
      }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 h-full">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 w-full backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-8 h-16">
          <h2 className="text-xl font-black tracking-tight">Clientes</h2>
          <div className="flex items-center gap-3">
            <button className="p-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors relative">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2.5 right-2.5 size-2 bg-red-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
            </button>
            <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
            <div className="flex items-center gap-3 pl-1 sm:pl-2">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black uppercase tracking-tight">Admin</p>
                <p className="text-[10px] text-slate-500 font-bold">Logística</p>
              </div>
              <img 
                 className="size-9 rounded-xl bg-slate-200 object-cover border-2 border-white dark:border-slate-800 shadow-sm" 
                 alt="User profile" 
                 src="https://lh3.googleusercontent.com/aida-public/AB6AXuBH00mXjg6hMuGH_H3WM48ZkGeSf5qZCDbAYunKkRdHkaVOse-O6QCuhB-0pJF6nbR5bRmFgJjnCS2fep1rwts8trl2dM4M6rpfcUnny164iO2NsaaI39hDGvv9ESZbNElGirGf_-XjUsF4VrFYvSnTYJ6gEftlZ0C0F2x-2Gb6jqtCJX5SyZqoA0m0BoZmJshis_b5_xAjbON1eQUdTQrcci591-3OGLMFHLRQAT4mkZFqZI_DcFQgXKm7DvXkDfxVNL7CtjDlP1I"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 max-w-7xl mx-auto w-full">
        
        {/* Top Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Gestión de Clientes</h3>
            <p className="text-slate-500 text-sm font-medium mt-1">Administra las cuentas de clientes.</p>
          </div>
          <button
             onClick={() => setIsAddModalOpen(true)}
             className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-primary/20 shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Añadir Cliente
          </button>
        </div>

        {/* Filters & Search */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none">search</span>
            <input 
               className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border min-h-[40px] border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary placeholder:text-slate-400" 
               placeholder="Buscar por nombre, contacto o email..." 
               type="text"
            />
          </div>
          <div className="flex gap-2 shrink-0 overflow-x-auto pb-1 lg:pb-0">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
               <button className="px-4 py-1.5 text-xs font-bold bg-white dark:bg-slate-700 shadow-sm rounded-md text-slate-900 dark:text-slate-100 min-w-max">Todas</button>
               <button className="px-4 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 min-w-max">Activas</button>
               <button className="px-4 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 min-w-max">Inactivas</button>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0">
               <span className="material-symbols-outlined text-lg">filter_list</span>
               Filtros
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden w-full">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-4 sm:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente / Empresa</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden lg:table-cell">CIF / NIF</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell">Contacto</th>
                  <th className="px-4 sm:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</th>
                  <th className="px-4 sm:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                    <tr>
                       <td colSpan={5} className="text-center py-12 text-slate-400 font-bold animate-pulse">Cargando clientes...</td>
                    </tr>
                ) : aseguradoras.length === 0 ? (
                    <tr>
                       <td colSpan={5} className="text-center py-12 text-slate-400 font-medium italic">No hay clientes registrados.</td>
                    </tr>
                ) : (
                    aseguradoras.map(aseguradora => (
                        <tr key={aseguradora.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                          <td className="px-4 sm:px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="size-10 shrink-0 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center p-2 border border-blue-200 dark:border-blue-700/50">
                                <span className="text-blue-600 dark:text-blue-400 font-black text-[10px] uppercase">{aseguradora.nombre.substring(0, 3)}</span>
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold truncate max-w-[150px] sm:max-w-none">{aseguradora.nombre}</p>
                                <p className="text-[10px] text-slate-500 font-mono hidden sm:block">ID: {aseguradora.id.split('-')[0]}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 hidden lg:table-cell">
                            <p className="text-xs font-bold text-slate-500">{aseguradora.cif || '-'}</p>
                          </td>
                          <td className="px-6 py-4 hidden md:table-cell">
                            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{aseguradora.persona_contacto || '-'}</p>
                            <p className="text-[10px] text-slate-400">{aseguradora.telefono || ''}</p>
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-center">
                            {aseguradora.estado === 'Activa' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 whitespace-nowrap">
                                  <span className="size-1.5 rounded-full bg-emerald-500"></span>
                                  Activa
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 whitespace-nowrap">
                                  <span className="size-1.5 rounded-full bg-slate-400"></span>
                                  Inactiva
                                </span>
                            )}
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => { setAseguradoraToEdit(aseguradora); setIsEditModalOpen(true); }}
                                className="size-8 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                title="Editar"
                              >
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>
                              <button
                                onClick={() => handleDelete(aseguradora.id)}
                                className="size-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                title="Borrar"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination - Only show if more than 10 */}
          {aseguradoras.length > 10 && (
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-slate-500 font-medium">Mostrando {aseguradoras.length} de {aseguradoras.length} clientes</p>
              <div className="flex gap-2">
                <button disabled className="size-8 flex items-center justify-center rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 disabled:opacity-50">
                  <span className="material-symbols-outlined text-lg block">chevron_left</span>
                </button>
                <button className="size-8 flex items-center justify-center rounded border border-primary bg-primary text-white font-bold text-xs">1</button>
                <button className="size-8 flex items-center justify-center rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 text-xs font-bold">2</button>
                <button className="size-8 flex items-center justify-center rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 text-xs font-bold">3</button>
                <button className="size-8 flex items-center justify-center rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 text-slate-600 dark:text-slate-400">
                  <span className="material-symbols-outlined text-lg block">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dashboard Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="size-12 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">corporate_fare</span>
            </div>
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Total Clientes</p>
              <p className="text-2xl font-black">{aseguradoras.length}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="size-12 shrink-0 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
              <span className="material-symbols-outlined">check_circle</span>
            </div>
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Intervenciones Activas</p>
              <p className="text-2xl font-black">{stats.intervencionesActivas}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="size-12 shrink-0 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
              <span className="material-symbols-outlined">trending_up</span>
            </div>
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Tasa de Resolución</p>
              <p className="text-2xl font-black">{stats.tasaResolucion}%</p>
            </div>
          </div>
        </div>

      </div>
      
      <AltaAseguradoraModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        onCreated={fetchAseguradoras}
      />

      {aseguradoraToEdit && (
         <EditarAseguradoraModal 
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onUpdated={fetchAseguradoras}
            aseguradoraData={aseguradoraToEdit}
         />
      )}
    </div>
  );
}
