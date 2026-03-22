import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

interface AltaAseguradoraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export default function AltaAseguradoraModal({ isOpen, onClose, onCreated }: AltaAseguradoraModalProps) {
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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);

      const { error } = await supabase.from('aseguradoras').insert({
          nombre: formData.nombre,
          persona_contacto: formData.persona_contacto,
          telefono: formData.telefono,
          email: formData.email,
          estado: formData.estado
      });

      setLoading(false);
      if (!error) {
          if (onCreated) onCreated();
          onClose();
          setFormData({ nombre: '', cif: '', persona_contacto: '', email: '', telefono: '', web: '', direccion: '', estado: 'Activa' });
      } else {
          console.error("Error creating aseguradora:", error);
          alert("Error al guardar la aseguradora.");
      }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {/* Modal Content */}
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Añadir Nueva Aseguradora</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Complete el formulario para registrar una nueva compañía.</p>
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
          <form id="altaAseguradoraForm" onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">
            
            {/* Company Info */}
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
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">ID / CIF</label>
              <input 
                 className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" 
                 placeholder="B12345678" 
                 type="text"
                 value={formData.cif}
                 onChange={(e) => setFormData({...formData, cif: e.target.value})}
              />
            </div>
            
            {/* Contact Info */}
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
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Sitio Web</label>
              <input 
                 className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" 
                 placeholder="https://www.ejemplo.com" 
                 type="url"
                 value={formData.web}
                 onChange={(e) => setFormData({...formData, web: e.target.value})}
              />
            </div>
            
            {/* Address */}
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Dirección</label>
              <input 
                 className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" 
                 placeholder="Calle, Número, Ciudad, CP" 
                 type="text"
                 value={formData.direccion}
                 onChange={(e) => setFormData({...formData, direccion: e.target.value})}
              />
            </div>
            
            {/* Logo & Status */}
            <div className="col-span-2 grid grid-cols-2 gap-6 items-center">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Logo de la Compañía</label>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center gap-2 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group">
                  <span className="material-symbols-outlined text-3xl text-slate-400 group-hover:text-primary transition-colors">upload_file</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">PNG, JPG hasta 5MB</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Estado Inicial</label>
                <div className="flex items-center gap-4">
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
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Determina si la compañía estará disponible inmediatamente.</p>
              </div>
            </div>
            
          </form>
        </div>
        
        {/* Modal Footer */}
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
             form="altaAseguradoraForm"
             className="px-8 py-2.5 rounded-lg font-bold text-sm bg-primary text-white hover:bg-primary/90 transition-all shadow-sm"
          >
             {loading ? 'Guardando...' : 'Guardar Aseguradora'}
          </button>
        </div>
        
      </div>
    </div>
  );
}
