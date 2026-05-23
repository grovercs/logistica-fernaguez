import React from 'react';

interface AltaUsuarioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AltaUsuarioModal({ isOpen, onClose }: AltaUsuarioModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {/* Modal Content */}
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Añadir Nuevo Usuario</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Cree un nuevo acceso a la plataforma.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined block">close</span>
          </button>
        </div>
        
        {/* Modal Body (Form) */}
        <div className="p-8 overflow-y-auto max-h-[70vh]">
          <form className="grid grid-cols-2 gap-6">
            
            {/* Identity Info */}
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Nombre y Apellidos *</label>
              <input 
                 className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" 
                 placeholder="Ej. Juan Pérez" 
                 type="text"
                 required
              />
            </div>
            
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Email de Acceso *</label>
              <input 
                 className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" 
                 placeholder="juan.perez@empresa.com" 
                 type="email"
                 required
              />
            </div>

            {/* Authorization */}
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Rol Asignado *</label>
              <select className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                  <option value="">Seleccione un rol</option>
                  <option value="admin">Administrador (Control total)</option>
                  <option value="editor">Editor (Agrega/Modifica datos)</option>
                  <option value="viewer">Visualizador (Solo lectura)</option>
              </select>
            </div>
            
            {/* Security Info */}
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Contraseña provisional *</label>
              <input 
                 className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" 
                 placeholder="Mínimo 8 caracteres" 
                 type="password"
                 required
              />
            </div>
            
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Repetir contraseña *</label>
              <input 
                 className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" 
                 placeholder="Vuelva a escribir la contraseña" 
                 type="password"
                 required
              />
            </div>
            
            {/* Status */}
            <div className="col-span-2 pt-2">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                  <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Estado de la cuenta</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Si está inactiva, el usuario no podrá iniciar sesión.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input defaultChecked className="sr-only peer" type="checkbox" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                  </label>
              </div>
            </div>
            
          </form>
        </div>
        
        {/* Modal Footer */}
        <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-800/30">
          <button 
             onClick={onClose}
             className="px-6 py-2.5 rounded-lg font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all border border-transparent shadow-sm"
          >
             Cancelar
          </button>
          <button className="px-8 py-2.5 rounded-lg font-bold text-sm bg-primary text-white hover:bg-primary/90 transition-all shadow-sm">
             Crear Usuario
          </button>
        </div>
        
      </div>
    </div>
  );
}
