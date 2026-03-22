import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

interface AltaTrabajadorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export default function AltaTrabajadorModal({ isOpen, onClose, onCreated }: AltaTrabajadorModalProps) {
  const [showNewSpecInput, setShowNewSpecInput] = useState(false);
  
  const [formData, setFormData] = useState({
      nombreCompleto: '',
      dni: '',
      especialidad: '',
      nuevaEspecialidad: '',
      telefono: '',
      email: '',
      fecha_incorporacion: ''
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);

      const parts = formData.nombreCompleto.trim().split(' ');
      const nombre = parts[0] || '';
      const apellidos = parts.slice(1).join(' ');

      const specToSave = showNewSpecInput && formData.nuevaEspecialidad ? formData.nuevaEspecialidad : formData.especialidad;

      const { error } = await supabase.from('trabajadores').insert({
          nombre: nombre,
          apellidos: apellidos,
          dni: formData.dni,
          especialidad: specToSave.toLowerCase(),
          telefono: formData.telefono,
          email: formData.email,
          fecha_incorporacion: formData.fecha_incorporacion || null,
          estado: 'Disponible'
      });

      setLoading(false);
      if (!error) {
          if (onCreated) onCreated();
          onClose();
          setFormData({ nombreCompleto: '', dni: '', especialidad: '', nuevaEspecialidad: '', telefono: '', email: '', fecha_incorporacion: '' });
      } else {
          console.error("Error creating trabajador:", error);
          alert("Error al guardar el trabajador.");
      }
  };

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
        <form id="altaTrabajadorForm" onSubmit={handleSubmit} className="p-6 max-h-[75vh] overflow-y-auto">
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
                 value={formData.nombreCompleto}
                 onChange={(e) => setFormData({...formData, nombreCompleto: e.target.value})}
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
                 value={formData.dni}
                 onChange={(e) => setFormData({...formData, dni: e.target.value})}
              />
            </div>
            
            {/* Speciality */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Especialidad *</label>
              <div className="flex gap-2">
                <select 
                   className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-700 dark:text-slate-300"
                   value={formData.especialidad}
                   onChange={(e) => setFormData({...formData, especialidad: e.target.value})}
                   required={!showNewSpecInput}
                >
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
                     required={showNewSpecInput}
                     value={formData.nuevaEspecialidad}
                     onChange={(e) => setFormData({...formData, nuevaEspecialidad: e.target.value})}
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
                 value={formData.telefono}
                 onChange={(e) => setFormData({...formData, telefono: e.target.value})}
              />
            </div>
            
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Correo Electrónico</label>
              <input 
                 className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400" 
                 placeholder="ejemplo@empresa.com" 
                 type="email"
                 value={formData.email}
                 onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            
            {/* Join Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Fecha de incorporación</label>
              <div className="relative">
                <input 
                   className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-700 dark:text-slate-300" 
                   type="date"
                   value={formData.fecha_incorporacion}
                   onChange={(e) => setFormData({...formData, fecha_incorporacion: e.target.value})}
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
               className="px-6 py-2.5 rounded-lg font-bold bg-primary text-white hover:bg-primary/90 shadow-sm transition-all disabled:opacity-50" 
               type="submit"
               disabled={loading}
               form="altaTrabajadorForm"
            >
               {loading ? 'Guardando...' : 'Guardar Trabajador'}
            </button>
          </div>
        </form>
        
      </div>
    </div>
  );
}
