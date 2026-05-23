

export default function Permisos() {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100">
      {/* Header */}
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 flex items-center justify-between sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
            <input 
              className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary transition-all placeholder:text-slate-400 outline-none" 
              placeholder="Buscar por clave de permiso o descripción..." 
              type="text"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <button className="relative text-slate-500 dark:text-slate-400 hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-2xl">notifications</span>
            <span className="absolute top-0 right-0 size-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
          </button>
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800"></div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold leading-none">Carlos Mendoza</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 uppercase font-semibold">Admin</p>
            </div>
            <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border-2 border-white dark:border-slate-800 shadow-sm">
              <img 
                alt="Avatar de usuario" 
                className="w-full h-full object-cover" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDlsUV6wu6yrVQnbhoGgDy5_rOQYEx4s6PWn9Af8n1FrExbx5Z6IF9UooH2PCd2BWqIZ8Hbv4ZHe1Jv0ldzWQspbQDeaN0ZIupisPs2sWwTZMDLtW37OMzelCGIb7o3C3opZc0HMOHExhSx54ieNN2byOytZR82VCx_aP2feJ4mzfxLZdpfhS2KeCwrVJOUgLU1ah3Kov38XdlORIYgnYpnUZVJEzuVac-hp9IlBqylKhjiJS4PEGaLLU-e4tRHKm5USFiWgwYSvUg"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6 max-w-7xl mx-auto w-full">
        
        {/* Breadcrumbs & Actions */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">Lista de Permisos</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Control de acceso granular y seguridad del sistema por roles.</p>
          </div>
          <div className="flex gap-3">
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
              <span className="material-symbols-outlined text-xl">download</span>
              Exportar
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 shadow-md shadow-primary/20 transition-all">
              <span className="material-symbols-outlined text-xl">add_circle</span>
              Nuevo Permiso
            </button>
          </div>
        </div>
        
        {/* Categories Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-800">
          <nav className="flex gap-8 overflow-x-auto no-scrollbar">
            <button className="pb-4 text-sm font-bold text-primary border-b-2 border-primary whitespace-nowrap">Gestión de Reportes</button>
            <button className="pb-4 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border-b-2 border-transparent transition-colors whitespace-nowrap">Gestión de Usuarios</button>
            <button className="pb-4 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border-b-2 border-transparent transition-colors whitespace-nowrap">Aseguradoras</button>
            <button className="pb-4 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border-b-2 border-transparent transition-colors whitespace-nowrap">Trabajadores</button>
            <button className="pb-4 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border-b-2 border-transparent transition-colors whitespace-nowrap">Administración del Sistema</button>
          </nav>
        </div>
        
        {/* Permissions Table Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-16 text-center">No</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nombre de la Clave</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Descripción del Permiso</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Roles Asignados</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                
                {/* Row 1 */}
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 text-center font-medium">01</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-sm">report.view</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Permite visualizar reportes generales del sistema y dashboard ejecutivo.
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black uppercase tracking-tight">Admin</span>
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black uppercase tracking-tight">Manager</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-black uppercase tracking-tight">Viewer</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded transition-all">
                        <span className="material-symbols-outlined text-lg block">edit</span>
                      </button>
                      <button className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded transition-all">
                        <span className="material-symbols-outlined text-lg block">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
                
                {/* Row 2 */}
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 text-center font-medium">02</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-sm">user.create</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Capacidad de crear y dar de alta nuevos usuarios en la plataforma.
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black uppercase tracking-tight">Admin</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded transition-all">
                        <span className="material-symbols-outlined text-lg block">edit</span>
                      </button>
                      <button className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded transition-all">
                        <span className="material-symbols-outlined text-lg block">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
                
                {/* Row 3 */}
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 text-center font-medium">03</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-sm">insured.edit</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Modificar datos sensibles y contratos de aseguradoras asociadas.
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black uppercase tracking-tight">Admin</span>
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black uppercase tracking-tight">Manager</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded transition-all">
                        <span className="material-symbols-outlined text-lg block">edit</span>
                      </button>
                      <button className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded transition-all">
                        <span className="material-symbols-outlined text-lg block">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Row 4 */}
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 text-center font-medium">04</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-sm">worker.delete</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Baja de registros de trabajadores en la base de datos histórica.
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black uppercase tracking-tight">Admin</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded transition-all">
                        <span className="material-symbols-outlined text-lg block">edit</span>
                      </button>
                      <button className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded transition-all">
                        <span className="material-symbols-outlined text-lg block">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
                
                {/* Row 5 */}
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 text-center font-medium">05</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-sm">rbac.manage</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Acceso total al módulo de seguridad para gestionar roles y permisos.
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black uppercase tracking-tight">Admin</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded transition-all">
                        <span className="material-symbols-outlined text-lg block">edit</span>
                      </button>
                      <button className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded transition-all">
                        <span className="material-symbols-outlined text-lg block">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
                
                {/* Row 6 */}
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 text-center font-medium">06</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-sm">role.assign</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Permite asignar roles específicos a los usuarios del sistema.
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black uppercase tracking-tight">Admin</span>
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black uppercase tracking-tight">Security Officer</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded transition-all">
                        <span className="material-symbols-outlined text-lg block">edit</span>
                      </button>
                      <button className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded transition-all">
                        <span className="material-symbols-outlined text-lg block">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>

              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/30 flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">Mostrando <span className="font-bold text-slate-900 dark:text-slate-100">1 - 6</span> de <span className="font-bold text-slate-900 dark:text-slate-100">42</span> permisos registrados</p>
            <div className="flex gap-2">
              <button disabled className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 transition-all disabled:opacity-50">
                <span className="material-symbols-outlined block">chevron_left</span>
              </button>
              <button className="size-10 rounded-lg bg-primary text-white font-bold text-sm shadow-md shadow-primary/20">1</button>
              <button className="size-10 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold text-sm hover:bg-white dark:hover:bg-slate-800 transition-colors">2</button>
              <button className="size-10 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold text-sm hover:bg-white dark:hover:bg-slate-800 transition-colors">3</button>
              <button className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-primary hover:bg-white dark:hover:bg-slate-800 transition-all">
                <span className="material-symbols-outlined block">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Dashboard Snapshot Widget */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="size-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 shrink-0">
              <span className="material-symbols-outlined text-[24px]">verified</span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Permisos Activos</p>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 leading-none">128</p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="size-12 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 shrink-0">
              <span className="material-symbols-outlined text-[24px]">group</span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Roles Definidos</p>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 leading-none">12</p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="size-12 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600 shrink-0">
              <span className="material-symbols-outlined text-[24px]">history</span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Último Cambio</p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-none">Hace 2 horas</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
