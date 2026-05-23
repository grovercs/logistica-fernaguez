import React, { useState } from 'react';
import AltaAseguradoraModal from '../components/modals/AltaAseguradoraModal';

export default function Aseguradoras() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 h-full">
      {/* Header */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-8 flex items-center justify-between shrink-0 sticky top-0 z-10 w-full">
        <h2 className="text-xl font-bold tracking-tight">Aseguradoras</h2>
        <div className="flex items-center gap-4">
          <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full relative transition-colors">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2 right-2 size-2 bg-red-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
          </button>
          <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-2"></div>
          <div className="flex items-center gap-3 pl-2">
            <div className="text-right">
              <p className="text-xs font-bold">Admin Usuario</p>
              <p className="text-[10px] text-slate-500 font-medium">Administrador</p>
            </div>
            <img 
               className="size-10 rounded-full bg-slate-200 object-cover" 
               alt="User profile" 
               src="https://lh3.googleusercontent.com/aida-public/AB6AXuBH00mXjg6hMuGH_H3WM48ZkGeSf5qZCDbAYunKkRdHkaVOse-O6QCuhB-0pJF6nbR5bRmFgJjnCS2fep1rwts8trl2dM4M6rpfcUnny164iO2NsaaI39hDGvv9ESZbNElGirGf_-XjUsF4VrFYvSnTYJ6gEftlZ0C0F2x-2Gb6jqtCJX5SyZqoA0m0BoZmJshis_b5_xAjbON1eQUdTQrcci591-3OGLMFHLRQAT4mkZFqZI_DcFQgXKm7DvXkDfxVNL7CtjDlP1I"
            />
          </div>
        </div>
      </header>

      {/* Content Area */}
      <div className="p-8 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full">
        
        {/* Top Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">Gestión de Partners</h3>
            <p className="text-slate-500 text-sm font-medium">Administra las compañías aseguradoras conectadas a la plataforma.</p>
          </div>
          <button 
             onClick={() => setIsAddModalOpen(true)}
             className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-bold text-sm transition-all shadow-lg shadow-primary/20 shrink-0"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Añadir Aseguradora
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
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden w-full">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Compañía</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Persona de Contacto</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Teléfono</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                
                {/* Row 1 */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 shrink-0 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center p-2">
                        <span className="text-blue-600 dark:text-blue-400 font-black text-xs">ALLZ</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold">Allianz Seguros</p>
                        <p className="text-[10px] text-slate-500">ID: AS-2342</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium">Carlos Rodríguez</p>
                    <p className="text-[10px] text-slate-500">Gestor de Cuentas</p>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">+34 912 345 678</td>
                  <td className="px-6 py-4 text-sm text-slate-500">c.rodriguez@allianz.es</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 whitespace-nowrap">
                      <span className="size-1.5 rounded-full bg-green-500"></span>
                      Activa
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-1 text-slate-400 hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-xl block">more_vert</span>
                    </button>
                  </td>
                </tr>
                
                {/* Row 2 */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 shrink-0 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center p-2">
                        <span className="text-red-600 dark:text-red-400 font-black text-xs">MFRE</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold">Mapfre</p>
                        <p className="text-[10px] text-slate-500">ID: MF-9011</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium">Elena Martínez</p>
                    <p className="text-[10px] text-slate-500">Siniestros Hogar</p>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">+34 910 000 111</td>
                  <td className="px-6 py-4 text-sm text-slate-500">e.martinez@mapfre.com</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 whitespace-nowrap">
                      <span className="size-1.5 rounded-full bg-green-500"></span>
                      Activa
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-1 text-slate-400 hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-xl block">more_vert</span>
                    </button>
                  </td>
                </tr>
                
                {/* Row 3 */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 shrink-0 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center p-2">
                        <span className="text-slate-600 dark:text-slate-400 font-black text-xs">MTUA</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold">Mutua Madrileña</p>
                        <p className="text-[10px] text-slate-500">ID: MM-5521</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium">Javier López</p>
                    <p className="text-[10px] text-slate-500">Atención Partner</p>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">+34 900 123 321</td>
                  <td className="px-6 py-4 text-sm text-slate-500">javier.l@mutua.es</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 whitespace-nowrap">
                      <span className="size-1.5 rounded-full bg-slate-400"></span>
                      Inactiva
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-1 text-slate-400 hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-xl block">more_vert</span>
                    </button>
                  </td>
                </tr>
                
                {/* Row 4 */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 shrink-0 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center p-2">
                        <span className="text-orange-600 dark:text-orange-400 font-black text-xs">AXA</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold">AXA Seguros</p>
                        <p className="text-[10px] text-slate-500">ID: AX-7721</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium">Marta Soria</p>
                    <p className="text-[10px] text-slate-500">Responsable VIP</p>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">+34 911 223 344</td>
                  <td className="px-6 py-4 text-sm text-slate-500">m.soria@axa.es</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 whitespace-nowrap">
                      <span className="size-1.5 rounded-full bg-green-500"></span>
                      Activa
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-1 text-slate-400 hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-xl block">more_vert</span>
                    </button>
                  </td>
                </tr>

              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500 font-medium">Mostrando 4 de 24 aseguradoras</p>
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
        </div>

        {/* Dashboard Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="size-12 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">corporate_fare</span>
            </div>
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Total Partners</p>
              <p className="text-2xl font-black">24</p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="size-12 shrink-0 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
              <span className="material-symbols-outlined">check_circle</span>
            </div>
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Siniestros Activos</p>
              <p className="text-2xl font-black">156</p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="size-12 shrink-0 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
              <span className="material-symbols-outlined">trending_up</span>
            </div>
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Tasa de Resolución</p>
              <p className="text-2xl font-black">88.4%</p>
            </div>
          </div>
        </div>

      </div>
      
      <AltaAseguradoraModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />
    </div>
  );
}
