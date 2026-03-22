import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface EditarRolModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleId: string | null;
  roleName: string | null;
  onSaved: () => void;
}

interface Permiso {
  id: string;
  clave: string;
  categoria: string;
  descripcion: string;
}

export default function EditarRolModal({ isOpen, onClose, roleId, roleName, onSaved }: EditarRolModalProps) {
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && roleId) {
      fetchData();
    }
  }, [isOpen, roleId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch all available permissions
      const { data: allPerms, error: permsError } = await supabase
        .from('permisos')
        .select('*')
        .order('categoria', { ascending: true });

      if (permsError) throw permsError;
      setPermisos(allPerms || []);

      // 2. Fetch current permissions for this role
      const { data: currentPerms, error: currentError } = await supabase
        .from('permisos_roles')
        .select('permiso_id')
        .eq('rol_id', roleId);

      if (currentError) throw currentError;
      
      const permIds = new Set(currentPerms?.map(p => p.permiso_id) || []);
      setSelectedPerms(permIds);
    } catch (error) {
      console.error('Error fetching role permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePermiso = (id: string) => {
    const newSelection = new Set(selectedPerms);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedPerms(newSelection);
  };

  const handleSave = async () => {
    if (!roleId) return;
    setSaving(true);
    try {
      // 1. Delete existing associations
      const { error: deleteError } = await supabase
        .from('permisos_roles')
        .delete()
        .eq('rol_id', roleId);

      if (deleteError) throw deleteError;

      // 2. Insert new associations
      if (selectedPerms.size > 0) {
        const newAssignments = Array.from(selectedPerms).map(permId => ({
          rol_id: roleId,
          permiso_id: permId
        }));

        const { error: insertError } = await supabase
          .from('permisos_roles')
          .insert(newAssignments);

        if (insertError) throw insertError;
      }

      onSaved();
      onClose();
    } catch (error) {
      console.error('Error saving role permissions:', error);
      alert('Error al guardar los permisos: ' + (error as any).message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  // Group permissions by category
  const categories = Array.from(new Set(permisos.map(p => p.categoria)));

  return (
    <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Gestionar Permisos: {roleName}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Asigne capacidades específicas a este nivel de acceso</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1">
            <span className="material-symbols-outlined block">close</span>
          </button>
        </div>
        
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              <p className="text-slate-400 font-medium">Cargando matriz de permisos...</p>
            </div>
          ) : (
            categories.map(cat => (
              <div key={cat} className="space-y-4">
                <div className="flex items-center gap-2 text-primary border-b border-primary/10 pb-2">
                  <span className="material-symbols-outlined text-sm">category</span>
                  <h4 className="text-xs font-black uppercase tracking-widest">{cat} Management</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-2">
                  {permisos
                    .filter(p => p.categoria === cat)
                    .map(p => (
                      <label 
                        key={p.id} 
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer group ${selectedPerms.has(p.id) ? 'bg-primary/5 border-primary shadow-sm' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-800 hover:border-primary/50'}`}
                      >
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 mt-0.5 rounded border-slate-300 text-primary focus:ring-primary transition-all"
                          checked={selectedPerms.has(p.id)}
                          onChange={() => togglePermiso(p.id)}
                        />
                        <div className="flex flex-col">
                          <span className={`text-sm font-bold ${selectedPerms.has(p.id) ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>
                            {p.clave.split('.')[1]}
                          </span>
                          <span className="text-[10px] text-slate-400 group-hover:text-slate-500 transition-colors">
                            {p.clave}
                          </span>
                        </div>
                      </label>
                    ))}
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Footer */}
        <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 shrink-0">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className={`bg-primary px-8 py-2.5 rounded-lg text-sm font-bold text-white shadow-md transition-all shadow-primary/20 flex items-center gap-2 ${saving ? 'opacity-70 cursor-not-allowed' : 'hover:bg-primary/90 active:scale-95'}`}
          >
            {saving ? (
              <>
                <span className="animate-spin size-4 border-2 border-white/30 border-t-white rounded-full"></span>
                Guardando...
              </>
            ) : (
              'Guardar Cambios'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
