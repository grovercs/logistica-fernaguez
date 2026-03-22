import React, { useState } from 'react';
import AltaUsuarioModal from '../components/modals/AltaUsuarioModal';

export default function Usuarios() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 h-full">
      {/* Header */}
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 shrink-0 sticky top-0 z-10 w-full">
        <div className="flex items-center gap-4 w-full max-w-md">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl pointer-events-none">search</span>
            <input 
               className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary/50 outline-none rounded-lg text-sm transition-all placeholder:text-slate-400" 
               placeholder="Buscar usuarios por nombre o email..." 
               type="text"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="relative p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <span className="material-symbols-outlined text-2xl">notifications</span>
            <span className="absolute top-2 right-2 size-2 bg-red-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
          </button>
          <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <span className="material-symbols-outlined text-2xl">settings</span>
          </button>
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2"></div>
          <div className="size-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm shrink-0">AU</div>
        </div>
      </header>
      
      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
        
        {/* Title & Action */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Gestión de Usuarios</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Administra los accesos, roles y permisos de los miembros de la plataforma.</p>
          </div>
          <button 
             onClick={() => setIsAddModalOpen(true)}
             className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-all shadow-lg shadow-primary/20 shrink-0"
          >
            <span className="material-symbols-outlined">person_add</span>
            <span>Añadir Usuario</span>
          </button>
        </div>
        
        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-slate-500 text-sm font-medium">Total Usuarios</p>
            <p className="text-2xl font-bold mt-1">1,248</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-slate-500 text-sm font-medium">Activos</p>
            <p className="text-2xl font-bold mt-1 text-emerald-500">1,120</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-slate-500 text-sm font-medium">Inactivos</p>
            <p className="text-2xl font-bold mt-1 text-red-500">128</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-slate-500 text-sm font-medium">Nuevos (Mes)</p>
            <p className="text-2xl font-bold mt-1 text-primary">+42</p>
          </div>
        </div>
        
        {/* Table Container */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Rol</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                
                {/* Row 1 */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs shrink-0">JP</div>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">Juan Pérez</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">juan.perez@empresa.com</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">Administrador</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <span className="size-1.5 rounded-full bg-emerald-500"></span>
                      Activo
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex items-center justify-end gap-2">
                       <button className="p-1.5 text-slate-400 hover:text-primary transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" title="Editar">
                         <span className="material-symbols-outlined block text-[20px]">edit</span>
                       </button>
                       <button className="p-1.5 text-slate-400 hover:text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Eliminar">
                         <span className="material-symbols-outlined block text-[20px]">delete</span>
                       </button>
                       <button className="p-1.5 text-slate-400 hover:text-amber-500 transition-colors hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg" title="Reset Password">
                         <span className="material-symbols-outlined block text-[20px]">lock_reset</span>
                       </button>
                    </div>
                  </td>
                </tr>
                
                {/* Row 2 */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs shrink-0">MG</div>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">María García</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">m.garcia@empresa.com</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">Editor</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <span className="size-1.5 rounded-full bg-emerald-500"></span>
                      Activo
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex items-center justify-end gap-2">
                       <button className="p-1.5 text-slate-400 hover:text-primary transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" title="Editar">
                         <span className="material-symbols-outlined block text-[20px]">edit</span>
                       </button>
                       <button className="p-1.5 text-slate-400 hover:text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Eliminar">
                         <span className="material-symbols-outlined block text-[20px]">delete</span>
                       </button>
                       <button className="p-1.5 text-slate-400 hover:text-amber-500 transition-colors hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg" title="Reset Password">
                         <span className="material-symbols-outlined block text-[20px]">lock_reset</span>
                       </button>
                    </div>
                  </td>
                </tr>
                
                {/* Row 3 */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs shrink-0">CR</div>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">Carlos Ruiz</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">c.ruiz@empresa.com</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">Visualizador</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500">
                      <span className="size-1.5 rounded-full bg-slate-400"></span>
                      Inactivo
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex items-center justify-end gap-2">
                       <button className="p-1.5 text-slate-400 hover:text-primary transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" title="Editar">
                         <span className="material-symbols-outlined block text-[20px]">edit</span>
                       </button>
                       <button className="p-1.5 text-slate-400 hover:text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Eliminar">
                         <span className="material-symbols-outlined block text-[20px]">delete</span>
                       </button>
                       <button className="p-1.5 text-slate-400 hover:text-amber-500 transition-colors hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg" title="Reset Password">
                         <span className="material-symbols-outlined block text-[20px]">lock_reset</span>
                       </button>
                    </div>
                  </td>
                </tr>
                
                {/* Row 4 */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs shrink-0">AL</div>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">Ana López</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">a.lopez@empresa.com</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">Administrador</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <span className="size-1.5 rounded-full bg-emerald-500"></span>
                      Activo
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex items-center justify-end gap-2">
                       <button className="p-1.5 text-slate-400 hover:text-primary transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" title="Editar">
                         <span className="material-symbols-outlined block text-[20px]">edit</span>
                       </button>
                       <button className="p-1.5 text-slate-400 hover:text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Eliminar">
                         <span className="material-symbols-outlined block text-[20px]">delete</span>
                       </button>
                       <button className="p-1.5 text-slate-400 hover:text-amber-500 transition-colors hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg" title="Reset Password">
                         <span className="material-symbols-outlined block text-[20px]">lock_reset</span>
                       </button>
                    </div>
                  </td>
                </tr>

              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/30">
            <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Mostrando 4 de 1,248 usuarios</span>
            <div className="flex items-center gap-1">
              <button className="size-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors bg-white dark:bg-slate-900">
                <span className="material-symbols-outlined text-sm block">chevron_left</span>
              </button>
              <button className="size-8 flex items-center justify-center rounded-lg bg-primary text-white font-bold text-xs shadow-sm shadow-primary/20">1</button>
              <button className="size-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs font-bold bg-white dark:bg-slate-900">2</button>
              <button className="size-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs font-bold bg-white dark:bg-slate-900">3</button>
              <span className="px-1 text-slate-400">...</span>
              <button className="size-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs font-bold bg-white dark:bg-slate-900">24</button>
              <button className="size-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors bg-white dark:bg-slate-900">
                <span className="material-symbols-outlined text-sm block">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

      </div>
      
      <AltaUsuarioModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />
    </div>
  );
}
