
import { useState } from 'react';
import { supabase } from '../../lib/supabase';

interface NuevoRolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function NuevoRolModal({ isOpen, onClose, onCreated }: NuevoRolModalProps) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!nombre.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('roles')
        .insert([{ nombre, descripcion }]);

      if (error) throw error;

      setNombre('');
      setDescripcion('');
      onCreated();
      onClose();
    } catch (error) {
      console.error('Error creating role:', error);
      alert('Error al crear el rol: ' + (error as any).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {/* Modal Container */}
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Añadir Nuevo Rol</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Configure un nuevo nivel de acceso base</p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
          >
            <span className="material-symbols-outlined block">close</span>
          </button>
        </div>
        
        {/* Modal Body */}
        <div className="px-8 py-6 space-y-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nombre del Rol</label>
            <input 
               value={nombre}
               onChange={(e) => setNombre(e.target.value)}
               className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-400 font-medium" 
               placeholder="Ej. Auditor Externo" 
               type="text"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Descripción</label>
            <textarea 
               value={descripcion}
               onChange={(e) => setDescripcion(e.target.value)}
               className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none placeholder:text-slate-400 text-sm" 
               placeholder="Describa brevemente el propósito de este rol..." 
               rows={3}
            ></textarea>
          </div>
          
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 p-4 rounded-xl flex gap-3">
            <span className="material-symbols-outlined text-amber-500">info</span>
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              Al crear un nuevo rol, este no tendrá permisos asignados por defecto. Deberá usar el botón de editar en la lista de roles para configurar sus capacidades granulares.
            </p>
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
          <button 
            onClick={handleCreate}
            disabled={loading || !nombre.trim()}
            className={`bg-primary px-6 py-2.5 rounded-lg text-sm font-bold text-white shadow-md transition-all shadow-primary/20 flex items-center gap-2 ${loading || !nombre.trim() ? 'opacity-70 cursor-not-allowed' : 'hover:bg-primary/90 active:scale-95'}`}
          >
            {loading ? (
              <>
                <span className="animate-spin size-4 border-2 border-white/30 border-t-white rounded-full"></span>
                Creando...
              </>
            ) : (
              'Crear Rol'
            )}
          </button>
        </div>
        
      </div>
    </div>
  );
}
