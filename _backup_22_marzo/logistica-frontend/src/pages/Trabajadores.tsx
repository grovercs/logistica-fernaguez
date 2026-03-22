import React, { useState } from 'react';
import AltaTrabajadorModal from '../components/modals/AltaTrabajadorModal';

export default function Trabajadores() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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
          <div className="flex items-center gap-3 overflow-x-auto pb-2 sm:pb-0">
            <select className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary outline-none shadow-sm cursor-pointer">
              <option>Todas las Especialidades</option>
              <option>Fontanero</option>
              <option>Electricista</option>
              <option>Albañil</option>
              <option>Pintor</option>
            </select>
            <select className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary outline-none shadow-sm cursor-pointer">
              <option>Todos los Estados</option>
              <option>Disponible</option>
              <option>En Obra</option>
              <option>No disponible</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm shrink-0">
              <span className="material-symbols-outlined text-[20px]">filter_list</span>
              Más Filtros
            </button>
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
                   <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Última Intervención</th>
                   <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Rendimiento</th>
                   <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                 
                 {/* Worker 1 */}
                 <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                   <td className="px-6 py-4 whitespace-nowrap">
                     <div className="flex items-center gap-3">
                       <img 
                          className="w-10 h-10 rounded-full object-cover bg-slate-100 shrink-0 border border-slate-200 dark:border-slate-700" 
                          alt="Juan Pérez" 
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCC1xn5XjzggLDRIc4vuzyYoIs5nPlJTlAZsAIanII8wQEGfueyEuhkQUPtIuYgrvJ8d88xZ9xA5RVdU3UcsUrZTwAPBEU1j75xuCGI0_wDeAOqXohjZqCnwe-QWC9lGvHEfd6cKGHXwjDKh3iQrVN9EFMq81mRhs98D6EqusaNhIjeX-w0DwuUx_yjLPFs5kwWP5B4FFXZaQU_m9j_AJn6gPXf51rWJslvPuGh10mSXnS4gwY7srnnFZdp1JZ36G9Z8XPd07tlWC4"
                       />
                       <div>
                         <p className="font-bold text-sm text-slate-900 dark:text-slate-100">Juan Pérez</p>
                         <p className="text-xs text-slate-500 mt-0.5">ID: #TK-0921</p>
                       </div>
                     </div>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap">
                     <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full">Fontanero</span>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap">
                     <div className="flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                       <span className="text-sm font-medium">Disponible</span>
                     </div>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap">
                     <p className="text-sm font-medium">Hoy, 09:30 AM</p>
                     <p className="text-xs text-slate-500 italic mt-0.5">Reparación tubería C/ Mayor</p>
                   </td>
                   <td className="px-6 py-4 text-center whitespace-nowrap">
                     <div className="flex items-center justify-center gap-1 text-amber-500">
                       <span className="material-symbols-outlined text-[18px] fill-amber-500" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                       <span className="text-sm font-bold text-slate-700 dark:text-slate-300">4.9</span>
                     </div>
                   </td>
                   <td className="px-6 py-4 text-right whitespace-nowrap">
                     <button className="p-1 text-slate-400 hover:text-primary transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                       <span className="material-symbols-outlined block">more_vert</span>
                     </button>
                   </td>
                 </tr>

                 {/* Worker 2 */}
                 <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                   <td className="px-6 py-4 whitespace-nowrap">
                     <div className="flex items-center gap-3">
                       <img 
                          className="w-10 h-10 rounded-full object-cover bg-slate-100 shrink-0 border border-slate-200 dark:border-slate-700" 
                          alt="Ricardo Gómez" 
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDhaf1GtL6Y-A9iSJPcFf7hxCZfV2fdxcpBT2df0QDmBX0JV0pomH1IgrhgWAdCE6eowEBVZjpCzL21A1asPdhZXtN2OTMDbJOCEReUf1xReQoKY-3Zk52oiY8KvyMuNn_mvDaaIAbnqL7uKWWWxxdPiqzSsH-2IqSZLDGNPwR-_nN0okAch4_tbkW7OjQPBXDaDG9UhvLplfzPovlhAzaHtT-q54cQAS5SFElJ2v1vA3FrnIooraNn_M-v9sAsynYg50IdvhxKwJE"
                       />
                       <div>
                         <p className="font-bold text-sm text-slate-900 dark:text-slate-100">Ricardo Gómez</p>
                         <p className="text-xs text-slate-500 mt-0.5">ID: #TK-1142</p>
                       </div>
                     </div>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap">
                     <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-full">Electricista</span>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap">
                     <div className="flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-primary"></span>
                       <span className="text-sm font-medium">En Obra</span>
                     </div>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap">
                     <p className="text-sm font-medium">En curso...</p>
                     <p className="text-xs text-slate-500 italic mt-0.5">Instalación panel solar</p>
                   </td>
                   <td className="px-6 py-4 text-center whitespace-nowrap">
                     <div className="flex items-center justify-center gap-1 text-amber-500">
                       <span className="material-symbols-outlined text-[18px] fill-amber-500" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                       <span className="text-sm font-bold text-slate-700 dark:text-slate-300">4.7</span>
                     </div>
                   </td>
                   <td className="px-6 py-4 text-right whitespace-nowrap">
                     <button className="p-1 text-slate-400 hover:text-primary transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                       <span className="material-symbols-outlined block">more_vert</span>
                     </button>
                   </td>
                 </tr>

                 {/* Worker 3 */}
                 <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                   <td className="px-6 py-4 whitespace-nowrap">
                     <div className="flex items-center gap-3">
                       <img 
                          className="w-10 h-10 rounded-full object-cover bg-slate-100 shrink-0 border border-slate-200 dark:border-slate-700" 
                          alt="Elena Sanz" 
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDv2fjJoW5aS4UJkS2FR5M0UF2EmHbTw2fxdgKlX8B87elA6Nzy17E6atoKBuqFOG0xSKqIrCxH0W3iwR5cxNGtVkYNH27jIvYLpwSsRvQWD7UD0BCyKgUTrOl8F3aBx0FBC-Sc0BVa-bToiSgbRHRwgcnupY8isbuxbI1AeDlYPHDP-C0fPQOVhFtz34PGvlghuTVN0iRnrJbECgtxLRxct7Ahs2JIVd4GcxUah4L-DP_D9ii562QGVNer7tLi3g4RpRTFnaPvC50"
                       />
                       <div>
                         <p className="font-bold text-sm text-slate-900 dark:text-slate-100">Elena Sanz</p>
                         <p className="text-xs text-slate-500 mt-0.5">ID: #TK-2287</p>
                       </div>
                     </div>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap">
                     <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-full border border-slate-200 dark:border-slate-700">Albañil</span>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap">
                     <div className="flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                       <span className="text-sm font-medium">No disponible</span>
                     </div>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap">
                     <p className="text-sm font-medium">Ayer, 18:15 PM</p>
                     <p className="text-xs text-slate-500 italic mt-0.5">Alicatado de baño</p>
                   </td>
                   <td className="px-6 py-4 text-center whitespace-nowrap">
                     <div className="flex items-center justify-center gap-1 text-amber-500">
                       <span className="material-symbols-outlined text-[18px] fill-amber-500" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                       <span className="text-sm font-bold text-slate-700 dark:text-slate-300">5.0</span>
                     </div>
                   </td>
                   <td className="px-6 py-4 text-right whitespace-nowrap">
                     <button className="p-1 text-slate-400 hover:text-primary transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                       <span className="material-symbols-outlined block">more_vert</span>
                     </button>
                   </td>
                 </tr>

                 {/* Worker 4 */}
                 <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                   <td className="px-6 py-4 whitespace-nowrap">
                     <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0 border border-primary/20">
                         MA
                       </div>
                       <div>
                         <p className="font-bold text-sm text-slate-900 dark:text-slate-100">Miguel Ángel</p>
                         <p className="text-xs text-slate-500 mt-0.5">ID: #TK-3341</p>
                       </div>
                     </div>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap">
                     <span className="px-2.5 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 text-xs font-bold rounded-full">Pintor</span>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap">
                     <div className="flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                       <span className="text-sm font-medium">Disponible</span>
                     </div>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap">
                     <p className="text-sm font-medium">Hace 2 días</p>
                     <p className="text-xs text-slate-500 italic mt-0.5">Pintura de fachada</p>
                   </td>
                   <td className="px-6 py-4 text-center whitespace-nowrap">
                     <div className="flex items-center justify-center gap-1 text-amber-500">
                       <span className="material-symbols-outlined text-[18px] fill-amber-500" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                       <span className="text-sm font-bold text-slate-700 dark:text-slate-300">4.2</span>
                     </div>
                   </td>
                   <td className="px-6 py-4 text-right whitespace-nowrap">
                     <button className="p-1 text-slate-400 hover:text-primary transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                       <span className="material-symbols-outlined block">more_vert</span>
                     </button>
                   </td>
                 </tr>

               </tbody>
             </table>
          </div>
          
          {/* Pagination */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 dark:border-slate-800 gap-4">
            <p className="text-sm text-slate-500 font-medium">Mostrando 4 de 24 trabajadores</p>
            <div className="flex items-center gap-2">
              <button disabled className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-xs font-bold text-slate-400 disabled:opacity-50 shadow-sm cursor-not-allowed">
                Anterior
              </button>
              <button className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-colors">
                Siguiente
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined">groups</span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Trabajadores</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">24</h3>
              <p className="text-xs text-emerald-500 flex items-center gap-1 mt-0.5 font-bold">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                +2 este mes
              </p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-600 shrink-0">
              <span className="material-symbols-outlined">construction</span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">En Obra Ahora</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">15</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">62% de la plantilla activa</p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-600 shrink-0">
              <span className="material-symbols-outlined">electric_bolt</span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Demanda</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">Electricista</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">8 intervenciones hoy</p>
            </div>
          </div>
        </div>

      </div>
      
      <AltaTrabajadorModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />
    </div>
  );
}
