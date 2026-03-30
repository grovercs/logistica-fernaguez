import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import NuevoReporteModal from '../components/modals/NuevoReporteModal';

export default function Dashboard() {
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [counts, setCounts] = useState({ pendientes: 0, enCurso: 0, finalizadas: 0 });
  const [weeklyActivity, setWeeklyActivity] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [dailyAgenda, setDailyAgenda] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchOrdenes(),
      fetchStats(),
      fetchWeeklyActivity(),
      fetchDailyAgenda()
    ]);
    setLoading(false);
  };

  const fetchOrdenes = async () => {
    const { data } = await supabase
      .from('ordenes')
      .select('*')
      .neq('estado', 'Archivado')
      .order('creado_en', { ascending: false })
      .limit(5);

    setOrdenes(data || []);
  };

  const fetchStats = async () => {
    const { data } = await supabase
      .from('ordenes')
      .select('estado')
      .neq('estado', 'Archivado');

    if (data) {
      const stats = {
        pendientes: data.filter(o => o.estado === 'Pendiente' || o.estado === 'Urgente').length,
        enCurso: data.filter(o => o.estado === 'En Curso' || o.estado === 'En revisión' || o.estado === 'Pendiente de firma').length,
        finalizadas: data.filter(o => o.estado === 'Finalizada').length
      };
      setCounts(stats);
    }
  };

  const fetchWeeklyActivity = async () => {
    // Get last 7 days of completed orders
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    const { data } = await supabase
      .from('ordenes')
      .select('creado_en')
      .gte('creado_en', sevenDaysAgo.toISOString());

    if (data) {
      const countsPerDay = [0, 0, 0, 0, 0, 0, 0];
      data.forEach(o => {
        const d = new Date(o.creado_en).getDay(); 
        // Sunday is 0, Mon is 1... Adjust to Mon-Sun (0-6)
        const dayIdx = d === 0 ? 6 : d - 1;
        countsPerDay[dayIdx]++;
      });
      setWeeklyActivity(countsPerDay);
    }
  };

  const fetchDailyAgenda = async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('reportes')
      .select('*, perfiles(nombre_completo), ordenes(id_legible, cliente, estado)')
      .eq('fecha_trabajo', todayStr)
      .limit(5);
    
    setDailyAgenda(data || []);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto w-full">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 w-full">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Dashboard Principal</h2>
        <div className="flex items-center gap-6">
          <div className="relative w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/50 placeholder:text-slate-500" placeholder="Buscar órdenes, técnicos..." type="text"/>
          </div>
          <div className="flex items-center gap-3">
            <button className="size-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-primary/10 hover:text-primary transition-all relative">
              <span className="material-symbols-outlined text-xl">notifications</span>
              <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
            </button>
          </div>
        </div>
      </header>
      
      <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
        {/* Summary Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="size-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
              <span className="material-symbols-outlined">pending_actions</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Pendientes</p>
              <p className="text-2xl font-bold">{loading ? '...' : counts.pendientes}</p>
              <p className="text-xs text-slate-400 font-medium">Requieren atención</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">sync</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">En Proceso</p>
              <p className="text-2xl font-bold">{loading ? '...' : counts.enCurso}</p>
              <p className="text-xs text-slate-400 font-medium">Intervenciones activas</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="size-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
              <span className="material-symbols-outlined">check_circle</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Finalizadas</p>
              <p className="text-2xl font-bold">{loading ? '...' : counts.finalizadas}</p>
              <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">done_all</span> Listas para cierre
              </p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Activity & Table */}
          <div className="lg:col-span-2 space-y-8">
            {/* Weekly Activity Chart */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-base font-bold">Actividad Semanal</h3>
                  <p className="text-xs text-slate-500">Órdenes creadas en los últimos 7 días</p>
                </div>
                <span className="text-sm font-bold text-primary">{weeklyActivity.reduce((a: number, b: number) => a + b, 0)} Registros</span>
              </div>
              <div className="flex items-end justify-between h-40 gap-2 px-2">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day, i) => {
                  const val = weeklyActivity[i];
                  const max = Math.max(...weeklyActivity, 1);
                  const height = (val / max) * 100;
                  return (
                    <div key={day} className="flex-1 flex flex-col items-center gap-2 group">
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-lg relative flex items-end overflow-hidden h-full">
                        <div 
                           className="w-full bg-primary/40 group-hover:bg-primary transition-all duration-500" 
                           style={{ height: `${height}%` }}
                           title={`${val} órdenes`}
                        ></div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">{day}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-base font-bold">Órdenes Recientes</h3>
                <button className="text-sm font-medium text-primary hover:underline">Ver todas</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-medium">
                    <tr>
                      <th className="px-6 py-3">ID OT</th>
                      <th className="px-6 py-3">Cliente</th>
                      <th className="px-6 py-3">Servicio</th>
                      <th className="px-6 py-3">Estado</th>
                      <th className="px-6 py-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {loading ? (
                      <tr><td colSpan={5} className="px-6 py-4 text-center text-slate-500 font-medium">Cargando órdenes desde Supabase...</td></tr>
                    ) : ordenes.length === 0 ? (
                      <tr><td colSpan={5} className="px-6 py-4 text-center text-slate-500">No hay órdenes recientes registradas.</td></tr>
                    ) : (
                      ordenes.map((orden: any) => (
                        <tr key={orden.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4 font-bold">{orden.id_legible}</td>
                          <td className="px-6 py-4">{orden.cliente}</td>
                          <td className="px-6 py-4 text-slate-500">{orden.descripcion || 'Sin servicio específico'}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
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
                            <Link to={`/ordenes/${orden.id}`} className="text-slate-400 hover:text-primary transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg p-2 inline-flex">
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

          {/* Right Column: Quick Access Calendar / Tasks */}
          <div className="space-y-8">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-base font-bold mb-6">Intervenciones de Hoy</h3>
              <div className="space-y-4">
                {dailyAgenda.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4 italic">No hay intervenciones registradas para hoy.</p>
                ) : (
                  dailyAgenda.map((item: any) => (
                    <div key={item.id} className="flex gap-4 group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 p-1 rounded-lg transition-colors" onClick={() => navigate?.(`/ordenes/${item.orden_id}`)}>
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-primary">{new Date(item.creado_en).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <div className="w-px h-full bg-slate-100 dark:bg-slate-800 my-2"></div>
                      </div>
                      <div className={`flex-1 p-3 rounded-lg border-l-4 shadow-sm ${
                        item.ordenes?.estado === 'Urgente' ? 'border-red-500 bg-red-50 dark:bg-red-900/10' :
                        item.ordenes?.estado === 'Finalizada' ? 'border-green-500 bg-green-50 dark:bg-green-900/10' :
                        'border-primary bg-slate-50 dark:bg-slate-800/50'
                      }`}>
                        <p className="text-xs font-bold truncate">{item.ordenes?.cliente}</p>
                        <p className="text-[10px] text-slate-500 truncate">{item.perfiles?.nombre_completo || 'Técnico'}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <Link to="/calendario" className="w-full mt-6 py-2 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-bold transition-colors flex items-center justify-center">
                Abrir Calendario Completo
              </Link>
            </div>
            {/* Quick Actions */}
            <div className="bg-primary p-6 rounded-xl shadow-lg shadow-primary/20 text-white relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-base font-bold mb-2">Nueva Orden</h3>
                <p className="text-white/80 text-sm mb-6">Asigna una nueva orden de trabajo de forma rápida.</p>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="bg-white text-primary px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-100 transition-all"
                >
                  <span className="material-symbols-outlined">add</span>
                  Crear Ahora
                </button>
              </div>
              <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-9xl text-white/10 select-none">post_add</span>
            </div>
          </div>
        </div>
      </div>

      <NuevoReporteModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={fetchAll}
      />
    </div>
  );
}
