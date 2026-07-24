import React from 'react';

export default function Dashboard() {
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
              <p className="text-2xl font-bold">12</p>
              <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">trending_up</span> +5% hoy
              </p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">sync</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">En Proceso</p>
              <p className="text-2xl font-bold">8</p>
              <p className="text-xs text-slate-500 font-medium">Sin cambios hoy</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="size-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
              <span className="material-symbols-outlined">check_circle</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Finalizadas</p>
              <p className="text-2xl font-bold">25</p>
              <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">trending_up</span> +10% hoy
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
                  <p className="text-xs text-slate-500">Órdenes completadas los últimos 7 días</p>
                </div>
                <span className="text-sm font-bold text-primary">145 Órdenes</span>
              </div>
              <div className="flex items-end justify-between h-40 gap-2 px-2">
                <div className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-lg relative flex items-end overflow-hidden h-full">
                    <div className="w-full bg-primary/40 group-hover:bg-primary transition-all" style={{ height: '40%' }}></div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">Lun</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-lg relative flex items-end overflow-hidden h-full">
                    <div className="w-full bg-primary/40 group-hover:bg-primary transition-all" style={{ height: '90%' }}></div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">Mar</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-lg relative flex items-end overflow-hidden h-full">
                    <div className="w-full bg-primary/40 group-hover:bg-primary transition-all" style={{ height: '25%' }}></div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">Mié</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-lg relative flex items-end overflow-hidden h-full">
                    <div className="w-full bg-primary/40 group-hover:bg-primary transition-all" style={{ height: '80%' }}></div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">Jue</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-lg relative flex items-end overflow-hidden h-full">
                    <div className="w-full bg-primary/40 group-hover:bg-primary transition-all" style={{ height: '70%' }}></div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">Vie</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-lg relative flex items-end overflow-hidden h-full">
                    <div className="w-full bg-primary/40 group-hover:bg-primary transition-all" style={{ height: '95%' }}></div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">Sáb</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-lg relative flex items-end overflow-hidden h-full">
                    <div className="w-full bg-primary/40 group-hover:bg-primary transition-all" style={{ height: '60%' }}></div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">Dom</span>
                </div>
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
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 font-bold">#4582</td>
                      <td className="px-6 py-4">Mantenimiento ABC</td>
                      <td className="px-6 py-4 text-slate-500">Aire Acondicionado</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-500 uppercase">Pendiente</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-slate-400 hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-lg">visibility</span>
                        </button>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 font-bold">#4581</td>
                      <td className="px-6 py-4">Sistemas Global</td>
                      <td className="px-6 py-4 text-slate-500">Instalación Red</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary uppercase">En Proceso</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-slate-400 hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-lg">visibility</span>
                        </button>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 font-bold">#4579</td>
                      <td className="px-6 py-4">Edificio Central</td>
                      <td className="px-6 py-4 text-slate-500">Reparación Eléctrica</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-500 uppercase">Finalizada</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-slate-400 hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-lg">visibility</span>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Quick Access Calendar / Tasks */}
          <div className="space-y-8">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-base font-bold mb-6">Calendario de Hoy</h3>
              <div className="space-y-4">
                {/* Calendar Item */}
                <div className="flex gap-4 group">
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-bold text-primary">09:00</span>
                    <div className="w-px h-full bg-slate-100 dark:bg-slate-800 my-2"></div>
                  </div>
                  <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border-l-4 border-primary">
                    <p className="text-sm font-bold truncate">Revisión Preventiva</p>
                    <p className="text-xs text-slate-500">Técnico: Roberto M.</p>
                  </div>
                </div>
                {/* Calendar Item */}
                <div className="flex gap-4 group">
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-bold text-slate-400">11:30</span>
                    <div className="w-px h-full bg-slate-100 dark:bg-slate-800 my-2"></div>
                  </div>
                  <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border-l-4 border-amber-400">
                    <p className="text-sm font-bold truncate">Reparación Urgente</p>
                    <p className="text-xs text-slate-500">Técnico: Ana J.</p>
                  </div>
                </div>
                {/* Calendar Item */}
                <div className="flex gap-4 group">
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-bold text-slate-400">14:00</span>
                    <div className="w-px h-full bg-slate-100 dark:bg-slate-800 my-2"></div>
                  </div>
                  <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border-l-4 border-slate-300">
                    <p className="text-sm font-bold truncate">Entrega de Materiales</p>
                    <p className="text-xs text-slate-500">Almacén Central</p>
                  </div>
                </div>
              </div>
              <button className="w-full mt-6 py-2 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-bold transition-colors">
                Abrir Calendario Completo
              </button>
            </div>
            {/* Quick Actions */}
            <div className="bg-primary p-6 rounded-xl shadow-lg shadow-primary/20 text-white relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-base font-bold mb-2">Nueva Orden</h3>
                <p className="text-white/80 text-sm mb-6">Asigna una nueva orden de trabajo de forma rápida.</p>
                <button className="bg-white text-primary px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-100 transition-all">
                  <span className="material-symbols-outlined">add</span>
                  Crear Ahora
                </button>
              </div>
              <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-9xl text-white/10 select-none">post_add</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
