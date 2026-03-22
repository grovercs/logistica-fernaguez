import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface EditarAseguradoraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  aseguradoraData: any;
}

export default function EditarAseguradoraModal({ isOpen, onClose, onUpdated, aseguradoraData }: EditarAseguradoraModalProps) {
  const [formData, setFormData] = useState({
     nombre: '',
     cif: '',
     persona_contacto: '',
     email: '',
     telefono: '',
     web: '',
     direccion: '',
     estado: 'Activa'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && aseguradoraData) {
        setFormData({
            nombre: aseguradoraData.nombre || '',
            cif: aseguradoraData.cif || '',
            persona_contacto: aseguradoraData.persona_contacto || '',
            email: aseguradoraData.email || '',
            telefono: aseguradoraData.telefono || '',
            web: aseguradoraData.web || '',
            direccion: aseguradoraData.direccion || '',
            estado: aseguradoraData.estado || 'Activa',
        });
    }
  }, [isOpen, aseguradoraData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);

      const { error } = await supabase
          .from('aseguradoras')
          .update({
              nombre: formData.nombre,
              persona_contacto: formData.persona_contacto,
              telefono: formData.telefono,
              email: formData.email,
              estado: formData.estado
          })
          .eq('id', aseguradoraData.id);

      setLoading(false);
      if (!error) {
          if (onUpdated) onUpdated();
          onClose();
      } else {
          console.error("Error updating aseguradora:", error);
          alert("Error al actualizar la aseguradora.");
      }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Editar Aseguradora</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Modifica los datos de <span className="font-bold text-primary">{aseguradoraData?.nombre}</span>.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined block">close</span>
          </button>
        </div>
        
        <div className="p-8 overflow-y-auto max-h-[70vh]">
          <form id="editarAseguradoraForm" onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">
            
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Nombre de la Compañía *</label>
              <input 
                 className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" 
                 placeholder="Ej. Seguros Universales" 
                 type="text"
                 required
                 value={formData.nombre}
                 onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Persona de Contacto</label>
              <input 
                 className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" 
                 placeholder="Nombre completo" 
                 type="text"
                 value={formData.persona_contacto}
                 onChange={(e) => setFormData({...formData, persona_contacto: e.target.value})}
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Email de Contacto</label>
              <input 
                 className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" 
                 placeholder="contacto@empresa.com" 
                 type="email"
                 value={formData.email}
                 onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Teléfono</label>
              <input 
                 className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" 
                 placeholder="+34 900 000 000" 
                 type="tel"
                 value={formData.telefono}
                 onChange={(e) => setFormData({...formData, telefono: e.target.value})}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Estado</label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  checked={formData.estado === 'Activa'} 
                  onChange={(e) => setFormData({...formData, estado: e.target.checked ? 'Activa' : 'Inactiva'})}
                  className="sr-only peer" 
                  type="checkbox" 
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                <span className="ms-3 text-sm font-medium text-slate-900 dark:text-slate-300">Activa</span>
              </label>
            </div>
            
          </form>
        </div>
        
        <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-800/30">
          <button 
             onClick={onClose}
             type="button"
             className="px-6 py-2.5 rounded-lg font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all border border-transparent shadow-sm"
          >
             Cancelar
          </button>
          <button 
             type="submit"
             disabled={loading}
             form="editarAseguradoraForm"
             className="px-8 py-2.5 rounded-lg font-bold text-sm bg-sky-500 hover:bg-sky-600 text-white transition-all shadow-sm"
          >
             {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
        
      </div>
    </div>
  );
}
