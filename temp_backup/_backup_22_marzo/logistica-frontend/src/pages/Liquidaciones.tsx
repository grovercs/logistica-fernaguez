import React from 'react';

export default function Liquidaciones() {
  return (
    <div className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-full">
      {/* Header */}
      <header className="h-16 flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 sticky top-0 z-10 w-full">
        <h2 className="text-lg font-bold">Liquidaciones</h2>
        <div className="flex items-center gap-4">
          <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>
      </header>

      {/* Scrollable Area */}
      <div className="p-8 space-y-6 max-w-7xl mx-auto">
        
        {/* Filters Section */}
        <section className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">Desde</label>
              <input 
                 className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-primary h-10 px-3 border" 
                 type="date"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">Hasta</label>
              <input 
                 className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-primary h-10 px-3 border" 
                 type="date"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">Trabajador</label>
              <select className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-primary h-10 px-3 border">
                <option>Todos los trabajadores</option>
                <option>Carlos Martínez</option>
                <option>Elena Rodríguez</option>
                <option>Marcos Soler</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">Obra / Referencia</label>
              <input 
                 className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-primary h-10 px-3 border" 
                 placeholder="Ej: OT-2023-0041" 
                 type="text"
              />
            </div>
            <div className="flex gap-2 h-10">
              <button className="h-full flex-1 bg-primary text-white text-sm font-bold min-w-[120px] rounded-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-lg">search</span>
                Filtrar
              </button>
            </div>
          </div>
        </section>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-sm font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-green-600">table_view</span>
              Exportar a Excel
            </button>
            <button className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-sm font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-red-600">picture_as_pdf</span>
              Exportar a PDF
            </button>
            <button className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-sm font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-slate-600">print</span>
              Imprimir
            </button>
          </div>
        </div>

        {/* Main Table Context Header */}
        <div className="mb-4 px-1">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span className="text-primary material-symbols-outlined">construction</span>
            <span>Referencia: <span className="text-primary">OT-2023-0041</span> - Obra: <span className="text-primary">Reforma Baños Gessa - Belen</span></span>
          </h3>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">Contexto de visualización de datos filtrados</p>
        </div>

        {/* Main Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre del Trabajador</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ref. Trabajo</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha Intervención</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Horas</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Tarifa</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Subtotal Trabajador</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">CM</div>
                    <span className="text-sm font-medium">Carlos Martínez</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">OT-2023-0041</td>
                <td className="px-6 py-4 text-sm">12 Oct 2023</td>
                <td className="px-6 py-4 text-sm text-center font-semibold text-slate-700 dark:text-slate-300">8.5</td>
                <td className="px-6 py-4 text-sm text-right text-slate-600 dark:text-slate-400">€25.00</td>
                <td className="px-6 py-4 text-sm text-right font-bold">€212.50</td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                    Procesada
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">ER</div>
                    <span className="text-sm font-medium">Elena Rodríguez</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">OT-2023-0045</td>
                <td className="px-6 py-4 text-sm">13 Oct 2023</td>
                <td className="px-6 py-4 text-sm text-center font-semibold text-slate-700 dark:text-slate-300">4.0</td>
                <td className="px-6 py-4 text-sm text-right text-slate-600 dark:text-slate-400">€30.00</td>
                <td className="px-6 py-4 text-sm text-right font-bold">€120.00</td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                    Pendiente
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">MS</div>
                    <span className="text-sm font-medium">Marcos Soler</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">OT-2023-0048</td>
                <td className="px-6 py-4 text-sm">14 Oct 2023</td>
                <td className="px-6 py-4 text-sm text-center font-semibold text-slate-700 dark:text-slate-300">6.0</td>
                <td className="px-6 py-4 text-sm text-right text-slate-600 dark:text-slate-400">€25.00</td>
                <td className="px-6 py-4 text-sm text-right font-bold">€150.00</td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                    Procesada
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Horas Trabajador</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">18.5</span>
              <span className="text-sm text-slate-400">horas</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 italic">Basado en el filtro actual</p>
          </div>
          
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total General Periodo</p>
            <div className="flex items-baseline gap-2 text-primary">
              <span className="text-2xl font-bold">142.0</span>
              <span className="text-sm font-semibold uppercase">horas</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">Suma total de todos los trabajadores</p>
          </div>
          
          <div className="bg-primary p-6 rounded-xl shadow-lg shadow-primary/20 text-white relative overflow-hidden">
            <div className="relative z-10">
               <p className="text-xs font-bold text-white/80 uppercase tracking-widest mb-1">Total Coste Mano de Obra</p>
               <p className="text-[11px] font-semibold text-white/90 mb-2">(OBRA SELECCIONADA: OT-2023-0041)</p>
               <div className="flex items-baseline gap-2">
                 <span className="text-3xl font-black">€3,550.00</span>
               </div>
               <p className="text-[10px] text-white/60 mt-1">Suma total facturable al cliente</p>
               <div className="mt-4 flex items-center gap-2 text-xs font-bold bg-white/20 w-fit px-3 py-1.5 rounded-lg">
                 <span className="material-symbols-outlined text-sm">payments</span>
                 Pago listo para aprobación
               </div>
            </div>
            
            {/* Background decoration */}
            <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-[120px] opacity-10 leading-none">account_balance_wallet</span>
          </div>
        </section>

      </div>
    </div>
  );
}
