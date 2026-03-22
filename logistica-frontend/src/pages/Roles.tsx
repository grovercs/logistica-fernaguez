import { useState } from 'react';
import NuevoRolModal from '../components/modals/NuevoRolModal';

export default function Roles() {
  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 h-full">
      {/* Header */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-8 flex items-center justify-between shrink-0 sticky top-0 z-10 w-full">
        <h2 className="text-xl font-bold">Gestión de Roles</h2>
        
        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input 
               className="bg-slate-100 dark:bg-slate-800 border-none rounded-lg pl-10 pr-4 py-2 text-sm w-64 focus:ring-2 focus:ring-primary transition-all outline-none" 
               placeholder="Buscar permisos o roles..." 
               type="text"
            />
          </div>
          <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 relative transition-colors">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
          </button>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
        
        {/* Title & Action section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
                <h3 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Configuración de Niveles de Acceso</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-2xl text-lg leading-relaxed">
                    Define y administra los roles de seguridad de la plataforma. Configura permisos específicos para asegurar que cada usuario tenga acceso únicamente a lo que necesita.
                </p>
            </div>
            <button 
               onClick={() => setIsAddRoleOpen(true)}
               className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-primary/25 transition-all active:scale-95 whitespace-nowrap"
            >
                <span className="material-symbols-outlined">add</span>
                <span>Añadir Nuevo Rol</span>
            </button>
        </div>
        
        {/* Roles Table Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rol</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Descripción</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Permisos Clave</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Usuarios</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {/* Administrador */}
                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-6 py-5">
                                <div className="flex items-center gap-3">
                                    <div className="size-8 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-xl">workspace_premium</span>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white">Administrador</span>
                                </div>
                            </td>
                            <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-400">Control total sobre todos los módulos, ajustes y bases de datos.</td>
                            <td className="px-6 py-5">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                                    Acceso Maestro
                                </span>
                            </td>
                            <td className="px-6 py-5 text-sm font-medium">5 usuarios</td>
                            <td className="px-6 py-5 text-right">
                                <div className="flex justify-end gap-2">
                                    <button className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400 transition-colors" title="Editar">
                                        <span className="material-symbols-outlined text-sm">edit</span>
                                    </button>
                                    <button className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400 transition-colors" title="Configurar">
                                        <span className="material-symbols-outlined text-sm">settings</span>
                                    </button>
                                </div>
                            </td>
                        </tr>
                        
                        {/* Editor */}
                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-6 py-5">
                                <div className="flex items-center gap-3">
                                    <div className="size-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-xl">edit_note</span>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white">Editor</span>
                                </div>
                            </td>
                            <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-400">Puede crear, modificar y eliminar registros en liquidaciones y reportes.</td>
                            <td className="px-6 py-5 flex flex-wrap gap-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">LECTURA</span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">ESCRITURA</span>
                            </td>
                            <td className="px-6 py-5 text-sm font-medium">12 usuarios</td>
                            <td className="px-6 py-5 text-right">
                                <div className="flex justify-end gap-2">
                                    <button className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400 transition-colors" title="Editar">
                                        <span className="material-symbols-outlined text-sm">edit</span>
                                    </button>
                                    <button className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400 transition-colors" title="Configurar">
                                        <span className="material-symbols-outlined text-sm">settings</span>
                                    </button>
                                </div>
                            </td>
                        </tr>
                        
                        {/* Visualizador */}
                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-6 py-5">
                                <div className="flex items-center gap-3">
                                    <div className="size-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-xl">visibility</span>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white">Visualizador</span>
                                </div>
                            </td>
                            <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-400">Acceso restringido únicamente para consulta de reportes y tableros.</td>
                            <td className="px-6 py-5">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">SOLO LECTURA</span>
                            </td>
                            <td className="px-6 py-5 text-sm font-medium">8 usuarios</td>
                            <td className="px-6 py-5 text-right">
                                <div className="flex justify-end gap-2">
                                    <button className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400 transition-colors" title="Editar">
                                        <span className="material-symbols-outlined text-sm">edit</span>
                                    </button>
                                    <button className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400 transition-colors" title="Configurar">
                                        <span className="material-symbols-outlined text-sm">settings</span>
                                    </button>
                                </div>
                            </td>
                        </tr>
                        
                        {/* Trabajador */}
                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors border-none">
                            <td className="px-6 py-5">
                                <div className="flex items-center gap-3">
                                    <div className="size-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-xl">engineering</span>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white">Trabajador</span>
                                </div>
                            </td>
                            <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-400">Acceso a perfil propio, marcaciones y gestión de tareas personales.</td>
                            <td className="px-6 py-5 flex flex-wrap gap-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">TAREAS</span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">MI PERFIL</span>
                            </td>
                            <td className="px-6 py-5 text-sm font-medium">45 usuarios</td>
                            <td className="px-6 py-5 text-right">
                                <div className="flex justify-end gap-2">
                                    <button className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400 transition-colors" title="Editar">
                                        <span className="material-symbols-outlined text-sm">edit</span>
                                    </button>
                                    <button className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400 transition-colors" title="Configurar">
                                        <span className="material-symbols-outlined text-sm">settings</span>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        
        {/* Stats/Capabilities Summary */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 p-6 rounded-2xl">
                <div className="flex items-center gap-3 text-primary mb-3">
                    <span className="material-symbols-outlined">rule</span>
                    <h4 className="font-bold">Jerarquía de Roles</h4>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">El sistema utiliza una estructura de herencia. Los roles superiores incluyen automáticamente los permisos de los inferiores.</p>
            </div>
            
            <div className="bg-slate-900 dark:bg-slate-800 text-white p-6 rounded-2xl shadow-md">
                <div className="flex items-center gap-3 mb-3 text-primary">
                    <span className="material-symbols-outlined">security_update_good</span>
                    <h4 className="font-bold">Seguridad RBAC</h4>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">Control de Acceso Basado en Roles (RBAC) activo. Actualmente auditando 124 acciones diferentes en el sistema.</p>
            </div>
            
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
                <div className="flex items-center gap-3 text-emerald-500 mb-3">
                    <span className="material-symbols-outlined">analytics</span>
                    <h4 className="font-bold text-slate-900 dark:text-white">Métricas de Uso</h4>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">70 usuarios activos hoy distribuidos en los 4 roles principales sin incidencias reportadas.</p>
            </div>
        </div>
        
      </div>

      <NuevoRolModal 
        isOpen={isAddRoleOpen} 
        onClose={() => setIsAddRoleOpen(false)} 
      />

    </div>
  );
}
