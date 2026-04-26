import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import NuevoReporteModal from '../components/modals/NuevoReporteModal';

export default function Dashboard() {
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [counts, setCounts] = useState({ pendientes: 0, enCurso: 0, finalizadas: 0 });
  const [weeklyActivity, setWeeklyActivity] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [dailyAgenda, setDailyAgenda] = useState<any[]>([]);
  const [urgentes, setUrgentes] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
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
      fetchDailyAgenda(),
      fetchUrgentes()
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
        const dayIdx = d === 0 ? 6 : d - 1;
        countsPerDay[dayIdx]++;
      });
      setWeeklyActivity(countsPerDay);
    }
  };

  const fetchDailyAgenda = async () => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    
    // Obtenemos las órdenes programadas para hoy
    const { data: ordenesHoy } = await supabase
      .from('ordenes')
      .select('id, id_legible, cliente, tecnico_id, hora_programada, estado')
      .eq('fecha_programada', todayStr)
      .limit(10);
    
    if (ordenesHoy && ordenesHoy.length > 0) {
      // Obtenemos los técnicos para ponerles nombre
      const tecnicoIds = ordenesHoy.map(o => o.tecnico_id).filter(Boolean);
      let tecnicosMap: Record<string, string> = {};
      
      if (tecnicoIds.length > 0) {
        const { data: trabData } = await supabase
          .from('trabajadores')
          .select('id, nombre, apellidos')
          .in('id', tecnicoIds);
        
        if (trabData) {
          trabData.forEach(t => {
            tecnicosMap[t.id] = `${t.nombre} ${t.apellidos}`;
          });
        }
      }

      const agendaConNombres = ordenesHoy.map(o => ({
        ...o,
        nombre_tecnico: o.tecnico_id ? tecnicosMap[o.tecnico_id] : 'Sin asignar'
      }));

      setDailyAgenda(agendaConNombres);
    } else {
      setDailyAgenda([]);
    }
  };
  
  const fetchUrgentes = async () => {
    const { data } = await supabase
      .from('ordenes')
      .select('id, id_legible, cliente, creado_en')
      .eq('estado', 'Urgente')
      .order('creado_en', { ascending: false });
    
    setUrgentes(data || []);
  };

  return (
    <div className="flex-1 flex flex-col w-full min-h-screen">
      {/* Header */}
      <header className="h-auto min-h-[64px] flex flex-col sm:flex-row items-center justify-between px-4 sm:px-8 py-4 sm:py-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 w-full gap-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white self-start sm:self-auto">Dashboard Principal</h2>
        <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/50 placeholder:text-slate-500" placeholder="Buscar órdenes..." type="text"/>
          </div>
          <div className="flex items-center gap-3 relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className={`size-10 rounded-xl flex items-center justify-center transition-all relative ${
                showNotifications ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-primary/10 hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-xl">notifications</span>
              {urgentes.length > 0 && (
                <span className="absolute -top-1 -right-1 size-5 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 animate-bounce">
                  {urgentes.length}
                </span>
              )}
            </button>

            {/* Dropdown de Notificaciones */}
            {showNotifications && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowNotifications(false)}></div>
                <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-30 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                    <h3 className="font-bold text-sm">Órdenes Urgentes</h3>
                    <span className="bg-red-100 text-red-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Crítico</span>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {urgentes.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">
                        <span className="material-symbols-outlined text-4xl block mb-2 opacity-20">check_circle</span>
                        <p className="text-xs">No hay alertas urgentes</p>
                      </div>
                    ) : (
                      urgentes.map(o => (
                        <div 
                          key={o.id} 
                          onClick={() => {
                            navigate(`/ordenes/${o.id}`);
                            setShowNotifications(false);
                          }}
                          className="p-4 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <p className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-primary transition-colors">{o.id_legible}</p>
                            <span className="text-[10px] text-slate-400">{new Date(o.creado_en).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{o.cliente}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
      
      <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full flex-1">
        {/* Summary Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
            <div className="size-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
              <span className="material-symbols-outlined">pending_actions</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">Pendientes</p>
              <p className="text-2xl font-black text-slate-800 dark:text-white">{loading ? '...' : counts.pendientes}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
            <div className="size-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
              <span className="material-symbols-outlined">sync</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">En Proceso</p>
              <p className="text-2xl font-black text-slate-800 dark:text-white">{loading ? '...' : counts.enCurso}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-all hover:shadow-md sm:col-span-2 lg:col-span-1">
            <div className="size-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
              <span className="material-symbols-outlined">check_circle</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">Finalizadas</p>
              <p className="text-2xl font-black text-slate-800 dark:text-white">{loading ? '...' : counts.finalizadas}</p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Activity & Table */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            {/* Chart */}
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white">Actividad Semanal</h3>
                  <p className="text-xs text-slate-500 font-medium">Nuevas órdenes registradas</p>
                </div>
              </div>
              <div className="flex items-end justify-between h-40 gap-1.5 sm:gap-3 px-1">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day, i) => {
                  const val = weeklyActivity[i];
                  const max = Math.max(...weeklyActivity, 1);
                  const height = (val / max) * 100;
                  return (
                    <div key={day} className="flex-1 flex flex-col items-center gap-3 group">
                      <div className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-xl relative flex items-end overflow-hidden h-full">
                        <div 
                           className="w-full bg-primary/40 group-hover:bg-primary transition-all duration-500 rounded-t-lg" 
                           style={{ height: `${height}%` }}
                        ></div>
                        {val > 0 && (
                          <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                            {val}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{day}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Orders Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-base font-black text-slate-800 dark:text-white">Órdenes Recientes</h3>
                <Link to="/ordenes" className="text-xs font-bold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors">Ver todas</Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                    <tr>
                      <th className="px-4 sm:px-6 py-4">ID OT</th>
                      <th className="px-4 sm:px-6 py-4">Cliente</th>
                      <th className="px-4 sm:px-6 py-4 hidden sm:table-cell">Servicio</th>
                      <th className="px-4 sm:px-6 py-4">Estado</th>
                      <th className="px-4 sm:px-6 py-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {loading ? (
                      <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 animate-pulse">Cargando...</td></tr>
                    ) : ordenes.map((orden: any) => (
                      <tr key={orden.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 sm:px-6 py-4 font-black text-slate-900 dark:text-white whitespace-nowrap">{orden.id_legible}</td>
                        <td className="px-4 sm:px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">
                          <div className="max-w-[120px] sm:max-w-none truncate">{orden.cliente}</div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-slate-500 max-w-[200px] truncate hidden sm:table-cell">{orden.descripcion || '---'}</td>
                        <td className="px-4 sm:px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            orden.estado === 'Urgente' ? 'bg-red-100 text-red-700' :
                            orden.estado === 'Finalizada' ? 'bg-green-100 text-green-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {orden.estado}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-right">
                          <Link to={`/ordenes/${orden.id}`} className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-primary hover:bg-primary/10 transition-all inline-flex items-center justify-center">
                            <span className="material-symbols-outlined text-lg">visibility</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6 sm:space-y-8">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-base font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">event_available</span>
                Agenda de Hoy
              </h3>
              <div className="space-y-5">
                {dailyAgenda.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="size-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                      <span className="material-symbols-outlined text-slate-200 text-3xl">calendar_today</span>
                    </div>
                    <p className="text-xs text-slate-400 font-medium italic">Sin intervenciones hoy</p>
                  </div>
                ) : (
                  dailyAgenda.map((item: any) => (
                    <div 
                      key={item.id} 
                      className="flex gap-4 group cursor-pointer"
                      onClick={() => navigate(`/ordenes/${item.id}`)}
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black text-primary">
                          {item.hora_programada ? item.hora_programada.substring(0, 5) : '--:--'}
                        </span>
                        <div className="w-0.5 flex-1 bg-slate-100 dark:bg-slate-800 my-1 rounded-full"></div>
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:border-primary/30 transition-all">
                          <p className="text-xs font-black text-slate-800 dark:text-white mb-1 truncate">{item.cliente}</p>
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
                            <span className="material-symbols-outlined text-[12px]">engineering</span>
                            {item.nombre_tecnico}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <Link to="/calendario" className="w-full mt-2 py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 transition-all flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-lg">calendar_month</span>
                Calendario Completo
              </Link>
            </div>

            {/* Quick Actions Card */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-2xl shadow-xl shadow-blue-600/20 text-white relative overflow-hidden group">
              <div className="relative z-10">
                <div className="size-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-white text-2xl">add_task</span>
                </div>
                <h3 className="text-xl font-black mb-2 tracking-tight">Nueva Orden</h3>
                <p className="text-white/70 text-sm mb-8 font-medium leading-relaxed">Asigna una nueva orden de trabajo ahora mismo de forma rápida y sencilla.</p>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="w-full bg-white text-blue-600 px-6 py-4 rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-black/10 hover:bg-blue-50 hover:translate-y-[-2px] transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined font-bold">add</span>
                  Crear Reporte
                </button>
              </div>
              {/* Background Shapes */}
              <div className="absolute top-[-20%] right-[-10%] size-40 bg-white/10 rounded-full blur-2xl"></div>
              <div className="absolute bottom-[-10%] left-[-10%] size-40 bg-indigo-400/20 rounded-full blur-2xl"></div>
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
