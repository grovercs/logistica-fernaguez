import React, { useState } from 'react';

interface AltaTrabajadorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AltaTrabajadorModal({ isOpen, onClose }: AltaTrabajadorModalProps) {
  const [showNewSpecInput, setShowNewSpecInput] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      {/* Modal Container */}
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Alta de Nuevo Trabajador</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Introduzca los datos para el registro en el sistema</p>
          </div>
          <button 
             onClick={onClose}
             className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
          >
            <span className="material-symbols-outlined block">close</span>
          </button>
        </div>
        
        {/* Modal Body (Form) */}
        <form className="p-6 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Profile Photo Section */}
            <div className="col-span-full flex items-center gap-6 pb-2">
              <div className="relative group cursor-pointer">
                <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-700 group-hover:border-primary transition-colors">
                  <span className="material-symbols-outlined text-3xl text-slate-400 group-hover:text-primary transition-colors">person_add</span>
                </div>
                <button className="absolute bottom-0 right-0 bg-primary text-white p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform" type="button">
                  <span className="material-symbols-outlined text-xs block">photo_camera</span>
                </button>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Foto de Perfil</p>
                <p className="text-xs text-slate-500">JPG, PNG o GIF. Máx 5MB</p>
              </div>
            </div>
            
            {/* Full Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nombre completo *</label>
              <input 
                 className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400" 
                 placeholder="Ej. Juan Pérez" 
                 type="text"
                 required
              />
            </div>
            
            {/* ID / DNI */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">DNI/NIE *</label>
              <input 
                 className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400" 
                 placeholder="12345678X" 
                 type="text"
                 required
              />
            </div>
            
            {/* Speciality */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Especialidad *</label>
              <div className="flex gap-2">
                <select className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-700 dark:text-slate-300">
                  <option value="">Seleccione especialidad</option>
                  <option value="fontaneria">Fontanería</option>
                  <option value="electricidad">Electricidad</option>
                  <option value="albanileria">Albañilería</option>
                  <option value="pintura">Pintura</option>
                  <option value="carpinteria">Carpintería</option>
                  <option value="climatizacion">Climatización</option>
                </select>
                <button 
                   type="button"
                   onClick={() => setShowNewSpecInput(!showNewSpecInput)}
                   className={`p-2.5 rounded-lg transition-colors border ${showNewSpecInput ? 'bg-primary/10 text-primary border-primary/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-primary/10 hover:text-primary'}`}
                   title="Añadir Nueva Especialidad"
                >
                  <span className="material-symbols-outlined text-xl block">{showNewSpecInput ? 'remove' : 'add'}</span>
                </button>
              </div>
              
              {showNewSpecInput && (
                <div className="mt-2 group animate-in slide-in-from-top-2 duration-200">
                  <input 
                     className="w-full px-4 py-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:border-solid outline-none transition-all placeholder:text-slate-400 text-sm" 
                     placeholder="O escribe una nueva especialidad..." 
                     type="text"
                     autoFocus
                  />
                </div>
              )}
            </div>
            
            {/* Phone */}
            <div className="flex flex-col gap-1.5 pt-[22px]">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Teléfono de contacto</label>
              <input 
                 className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400" 
                 placeholder="+34 600 000 000" 
                 type="tel"
              />
            </div>
            
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Correo Electrónico</label>
              <input 
                 className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400" 
                 placeholder="ejemplo@empresa.com" 
                 type="email"
              />
            </div>
            
            {/* Join Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Fecha de incorporación</label>
              <div className="relative">
                <input 
                   className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-700 dark:text-slate-300" 
                   type="date"
                />
              </div>
            </div>
            
          </div>
          
          {/* Modal Footer */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <button 
               onClick={onClose}
               className="px-6 py-2.5 rounded-lg font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent shadow-sm" 
               type="button"
            >
               Cancelar
            </button>
            <button 
               className="px-6 py-2.5 rounded-lg font-bold bg-primary text-white hover:bg-primary/90 shadow-sm transition-all" 
               type="submit"
            >
               Guardar Trabajador
            </button>
          </div>
        </form>
        
      </div>
    </div>
  );
}
