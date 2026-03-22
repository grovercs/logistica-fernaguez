import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import NuevoReporteModal from '../components/modals/NuevoReporteModal';

export default function Ordenes() {
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchOrdenes();
  }, []);

  const fetchOrdenes = async () => {
    const { data, error } = await supabase
      .from('ordenes')
      .select('*')
      .order('creado_en', { ascending: false });

    if (!error && data) {
      setOrdenes(data);
    }
    setLoading(false);
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
      
      <div className="p-8 max-w-7xl mx-auto w-full">
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
              ) : ordenes.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">No hay órdenes registradas activas en este momento.</td></tr>
              ) : (
                ordenes.map((orden) => (
                  <tr key={orden.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                        <Link to={`/ordenes/${orden.id}`} className="hover:text-primary transition-colors underline decoration-transparent group-hover:decoration-primary/30">{orden.id_legible}</Link>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">
                        {new Date(orden.creado_en).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' })}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">{orden.cliente}</td>
                    <td className="px-6 py-4 text-slate-500">{orden.descripcion || 'Sin servicio específico'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        orden.estado === 'Pendiente' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-500' :
                        orden.estado === 'En Curso' ? 'bg-primary/10 text-primary' :
                        'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-500'
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
