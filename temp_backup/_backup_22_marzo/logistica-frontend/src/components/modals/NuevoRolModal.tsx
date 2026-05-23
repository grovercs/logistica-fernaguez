

interface NuevoRolModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NuevoRolModal({ isOpen, onClose }: NuevoRolModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {/* Modal Container */}
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Añadir Nuevo Rol</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Configure un nuevo perfil de acceso granular</p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
          >
            <span className="material-symbols-outlined block">close</span>
          </button>
        </div>
        
        {/* Modal Body */}
        <div className="px-8 py-6 space-y-6 max-h-[70vh] overflow-y-auto">
          
          {/* Role Basic Info */}
          <div className="grid grid-cols-1 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nombre del Rol</label>
              <input 
                 className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-400" 
                 placeholder="Ej. Supervisor de Ventas" 
                 type="text"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Descripción del Rol</label>
              <textarea 
                 className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none placeholder:text-slate-400" 
                 placeholder="Describa el alcance de las responsabilidades de este rol..." 
                 rows={3}
              ></textarea>
            </div>
          </div>
          
          {/* Permissions Selection */}
          <div className="space-y-4">
            <h4 className="text-sm font-black uppercase tracking-widest text-primary border-b border-primary/20 pb-2">Selección de Permisos</h4>
            
            {/* Category: Reports */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-slate-600 dark:text-slate-400">folder_open</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">Reportes</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pl-6">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary dark:bg-slate-800 dark:border-slate-700 focus:ring-offset-slate-900 transition-colors" type="checkbox"/>
                  <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">report.list</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary dark:bg-slate-800 dark:border-slate-700 focus:ring-offset-slate-900 transition-colors" type="checkbox"/>
                  <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">report.create</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary dark:bg-slate-800 dark:border-slate-700 focus:ring-offset-slate-900 transition-colors" type="checkbox"/>
                  <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">report.export</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary dark:bg-slate-800 dark:border-slate-700 focus:ring-offset-slate-900 transition-colors" type="checkbox"/>
                  <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">report.delete</span>
                </label>
              </div>
            </div>
            
            {/* Category: Users */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-slate-600 dark:text-slate-400">group</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">Usuarios</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pl-6">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary dark:bg-slate-800 dark:border-slate-700 focus:ring-offset-slate-900 transition-colors" type="checkbox"/>
                  <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">user.manage</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary dark:bg-slate-800 dark:border-slate-700 focus:ring-offset-slate-900 transition-colors" type="checkbox"/>
                  <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">user.create</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary dark:bg-slate-800 dark:border-slate-700 focus:ring-offset-slate-900 transition-colors" type="checkbox"/>
                  <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">user.assign_role</span>
                </label>
              </div>
            </div>
            
            {/* Category: System */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-slate-600 dark:text-slate-400">settings</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">Sistema</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pl-6">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary dark:bg-slate-800 dark:border-slate-700 focus:ring-offset-slate-900 transition-colors" type="checkbox"/>
                  <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">system.audit_logs</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary dark:bg-slate-800 dark:border-slate-700 focus:ring-offset-slate-900 transition-colors" type="checkbox"/>
                  <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">system.database_backup</span>
                </label>
              </div>
            </div>
            
          </div>
        </div>
        
        {/* Modal Footer */}
        <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Cancelar
          </button>
          <button className="bg-primary px-6 py-2.5 rounded-lg text-sm font-bold text-white shadow-md hover:bg-primary/90 transition-colors shadow-primary/20">
            Crear Rol
          </button>
        </div>
        
      </div>
    </div>
  );
}
