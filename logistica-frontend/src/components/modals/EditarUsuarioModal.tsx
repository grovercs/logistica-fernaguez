import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { supabaseAdmin } from '../../lib/supabase-admin';

interface EditarUsuarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  usuario: any;
  roles: any[];
  onUpdated: () => void;
}

export default function EditarUsuarioModal({ isOpen, onClose, usuario, roles, onUpdated }: EditarUsuarioModalProps) {
  const [nombre, setNombre] = useState('');
  const [rolId, setRolId] = useState('');
  const [activo, setActivo] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showReset, setShowReset] = useState(false);

  useEffect(() => {
    if (usuario) {
      setNombre(usuario.nombre_completo || '');
      setRolId(usuario.rol_id || '');
      setActivo(usuario.activo ?? true);
      setNewPassword('');
      setConfirmPassword('');
      setShowReset(false);
    }
  }, [usuario]);

  if (!isOpen || !usuario) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const { error } = await supabase
      .from('perfiles')
      .update({
        nombre_completo: nombre,
        rol_id: rolId || null,
        activo: activo
      })
      .eq('id', usuario.id);

    setIsSaving(false);
    if (!error) {
      onUpdated();
      onClose();
    } else {
      alert('Error al actualizar el usuario: ' + error.message);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
        alert('La contraseña debe tener al menos 6 caracteres.');
        return;
    }

    if (newPassword !== confirmPassword) {
        alert('Las contraseñas no coinciden.');
        return;
    }

    setIsResetting(true);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(usuario.id, {
        password: newPassword
    });
    setIsResetting(false);

    if (!error) {
        alert('Contraseña actualizada correctamente.');
        setShowReset(false);
        setNewPassword('');
    } else {
        alert('Error al actualizar contraseña: ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Editar Usuario</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Email: <span className="font-semibold text-primary">{usuario.email}</span></p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <span className="material-symbols-outlined block">close</span>
          </button>
        </div>
        
        <form onSubmit={handleUpdate} className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Nombre Completo *</label>
            <input 
               className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" 
               type="text"
               value={nombre}
               onChange={(e) => setNombre(e.target.value)}
               required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Rol Asignado</label>
            <select 
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              value={rolId}
              onChange={(e) => setRolId(e.target.value)}
            >
                <option value="">Sin Rol</option>
                {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.nombre}</option>
                ))}
            </select>
          </div>
          
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
              <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Estado de la cuenta</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Si está inactiva, el usuario no podrá operar.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
              </label>
          </div>

          {/* Password Reset Section */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
             {!showReset ? (
                 <button 
                    type="button" 
                    onClick={() => setShowReset(true)}
                    className="flex items-center gap-2 text-sm font-bold text-amber-600 dark:text-amber-500 hover:underline"
                 >
                    <span className="material-symbols-outlined text-sm">lock_reset</span>
                    Cambiar contraseña de este usuario
                 </button>
             ) : (
                 <div className="space-y-3 bg-amber-50/50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nueva Contraseña</label>
                        <input 
                            className="w-full px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-amber-500/20"
                            type="password"
                            placeholder="Mínimo 6 chars"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Repita la nueva contraseña</label>
                        <input 
                            className="w-full px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-amber-500/20"
                            type="password"
                            placeholder="Confirme la contraseña"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                        <button 
                            type="button"
                            onClick={() => setShowReset(false)}
                            className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="button"
                            disabled={isResetting}
                            onClick={handleResetPassword}
                            className="px-4 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-all disabled:opacity-50"
                        >
                            {isResetting ? 'Actualizando...' : 'Actualizar Contraseña'}
                        </button>
                    </div>
                 </div>
             )}
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button 
               type="button"
               onClick={onClose}
               className="px-6 py-2.5 rounded-lg font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all border border-transparent"
            >
               Cancelar
            </button>
            <button 
               type="submit"
               disabled={isSaving}
               className="px-8 py-2.5 rounded-lg font-bold text-sm bg-primary text-white hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50"
            >
               {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
