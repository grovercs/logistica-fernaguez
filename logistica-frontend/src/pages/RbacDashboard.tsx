

export default function RbacDashboard() {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100">
      {/* Header is handled by Layout in standard views, but this screen has a custom internal header */}
      
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8 lg:p-12 w-full">
        <div className="max-w-6xl mx-auto space-y-8">
            
            {/* Header / Title */}
            <div className="flex flex-col gap-2">
                <h2 className="text-slate-900 dark:text-white text-4xl font-black leading-tight tracking-tight">Panel de Control RBAC</h2>
                <p className="text-slate-500 dark:text-slate-400 text-lg font-normal">Asignación centralizada de roles y permisos específicos a usuarios</p>
            </div>
            
            {/* Table Section */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-primary/10 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-primary/10">
                    <h3 className="text-slate-900 dark:text-white text-xl font-bold">Usuarios y sus Accesos</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nombre</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rol Actual</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Permisos Directos</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-primary/5 dark:divide-slate-800">
                            
                            {/* User 1 */}
                            <tr className="hover:bg-primary/5 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">Juan Pérez</td>
                                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">juan@empresa.com</td>
                                <td className="px-6 py-4">
                                    <span className="px-3 py-1 text-xs font-bold bg-primary/10 text-primary rounded-full">Administrador</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-1.5 flex-wrap">
                                        <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">Escritura</span>
                                        <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">Eliminar</span>
                                    </div>
                                </td>
                            </tr>
                            
                            {/* User 2 */}
                            <tr className="hover:bg-primary/5 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">María García</td>
                                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">maria@empresa.com</td>
                                <td className="px-6 py-4">
                                    <span className="px-3 py-1 text-xs font-bold bg-green-500/10 text-green-600 rounded-full">Editor</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-1.5 flex-wrap">
                                        <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">Publicar</span>
                                    </div>
                                </td>
                            </tr>
                            
                            {/* User 3 */}
                            <tr className="hover:bg-primary/5 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">Carlos López</td>
                                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">carlos@empresa.com</td>
                                <td className="px-6 py-4">
                                    <span className="px-3 py-1 text-xs font-bold bg-amber-500/10 text-amber-600 rounded-full">Visualizador</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className="text-xs text-slate-400 italic">Ninguno</span>
                                </td>
                            </tr>
                            
                            {/* User 4 */}
                            <tr className="hover:bg-primary/5 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">Ana Martínez</td>
                                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">ana.m@empresa.com</td>
                                <td className="px-6 py-4">
                                    <span className="px-3 py-1 text-xs font-bold bg-purple-500/10 text-purple-600 rounded-full">Gestor RH</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-1.5 flex-wrap">
                                        <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">Audit</span>
                                    </div>
                                </td>
                            </tr>
                            
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Quick Actions Panel */}
            <div className="space-y-4">
                <h3 className="text-[#0d141b] dark:text-white text-xl font-bold">Acciones Rápidas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Action Card 1: Assign Role */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-primary/10 shadow-sm flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                <span className="material-symbols-outlined">person_add</span>
                            </div>
                            <h4 className="font-bold text-slate-900 dark:text-white">Asignar Rol a Usuario</h4>
                        </div>
                        <div className="space-y-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Usuario</label>
                                <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm p-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-white">
                                    <option>Seleccione un usuario...</option>
                                    <option>Juan Pérez</option>
                                    <option>María García</option>
                                    <option>Carlos López</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Nuevo Rol</label>
                                <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm p-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-white">
                                    <option>Seleccione el rol...</option>
                                    <option>Administrador</option>
                                    <option>Editor</option>
                                    <option>Visualizador</option>
                                    <option>Soporte Técnico</option>
                                </select>
                            </div>
                            <button className="w-full bg-primary text-white py-2.5 rounded-lg font-bold text-sm hover:shadow-lg hover:shadow-primary/20 transition-all mt-2 active:scale-[0.98]">
                                Actualizar Rol
                            </button>
                        </div>
                    </div>
                    
                    {/* Action Card 2: Assign Specific Permission */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-primary/10 shadow-sm flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                                <span className="material-symbols-outlined">key_visualizer</span>
                            </div>
                            <h4 className="font-bold text-slate-900 dark:text-white">Asignar Permiso Específico</h4>
                        </div>
                        <div className="space-y-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Usuario</label>
                                <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm p-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-white">
                                    <option>Seleccione un usuario...</option>
                                    <option>Juan Pérez</option>
                                    <option>María García</option>
                                    <option>Carlos López</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Permiso (Excepción)</label>
                                <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm p-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-white">
                                    <option>Seleccione un permiso...</option>
                                    <option>Eliminar Registros</option>
                                    <option>Exportar Base de Datos</option>
                                    <option>Acceso a Logs Críticos</option>
                                    <option>Gestión de API</option>
                                </select>
                            </div>
                            <button className="w-full bg-primary text-white py-2.5 rounded-lg font-bold text-sm hover:shadow-lg hover:shadow-primary/20 transition-all mt-2 active:scale-[0.98]">
                                Otorgar Excepción
                            </button>
                        </div>
                    </div>
                    
                </div>
            </div>
            
        </div>
      </div>
    </div>
  );
}
