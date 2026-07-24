import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { supabaseAdmin } from '../../lib/supabase-admin';

interface AltaUsuarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function AltaUsuarioModal({ isOpen, onClose, onCreated }: AltaUsuarioModalProps) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [rolId, setRolId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [activo, setActivo] = useState(true);
  const [roles, setRoles] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
        fetchRoles();
        // Reset form
        setNombre('');
        setEmail('');
        setRolId('');
        setPassword('');
        setConfirmPassword('');
        setActivo(true);
    }
  }, [isOpen]);

  const fetchRoles = async () => {
    const { data } = await supabase.from('roles').select('*');
    if (data) setRoles(data);
  };

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rolId) return alert('Por favor, selecciona un rol.');
    if (password !== confirmPassword) return alert('Las contraseñas no coinciden.');
    
    setIsSaving(true);
    try {
        // 1. Create Auth User
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { nombre_completo: nombre }
        });

        if (authError) throw authError;

        const userId = authData.user?.id;
        if (!userId) throw new Error('No se pudo obtener el ID del nuevo usuario.');

        // 2. Create/Update Profile
        // We use upsert because a DB trigger might have already created a basic profile
        const { error: profileError } = await supabase.from('perfiles').upsert({
            id: userId,
            nombre_completo: nombre,
            rol_id: rolId,
            activo: activo
        }, { onConflict: 'id' });

        if (profileError) throw profileError;

        onCreated();
        onClose();
    } catch (err: any) {
        alert('Error al crear usuario: ' + err.message);
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Añadir Nuevo Usuario</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Cree un nuevo acceso a la plataforma.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <span className="material-symbols-outlined block">close</span>
          </button>
        </div>
        
        <form onSubmit={handleCreate} className="p-8 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Nombre y Apellidos *</label>
              <input 
                 className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary" 
                 placeholder="Ej. Juan Pérez" 
                 type="text"
                 value={nombre}
                 onChange={(e) => setNombre(e.target.value)}
                 required
              />
            </div>
            
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Email de Acceso *</label>
              <input 
                 className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary" 
                 placeholder="juan.perez@empresa.com" 
                 type="email"
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Rol Asignado *</label>
              <select 
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary"
                value={rolId}
                onChange={(e) => setRolId(e.target.value)}
                required
              >
                  <option value="">Seleccione un rol</option>
                  {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.nombre}</option>
                  ))}
              </select>
            </div>
            
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Contraseña provisional *</label>
              <input 
                 className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary" 
                 placeholder="Mínimo 6 caracteres" 
                 type="password"
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 required
                 minLength={6}
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Repetir Contraseña *</label>
              <input 
                 className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary" 
                 placeholder="Repita la contraseña" 
                 type="password"
                 value={confirmPassword}
                 onChange={(e) => setConfirmPassword(e.target.value)}
                 required
                 minLength={6}
              />
            </div>
            
            <div className="col-span-2 pt-2">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                  <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Estado de la cuenta</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Si está inactiva, el usuario no podrá iniciar sesión.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      className="sr-only peer" 
                      type="checkbox" 
                      checked={activo}
                      onChange={(e) => setActivo(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                  </label>
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex justify-end gap-3">
            <button 
               type="button"
               onClick={onClose}
               className="px-6 py-2.5 rounded-lg font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all border border-transparent shadow-sm"
            >
               Cancelar
            </button>
            <button 
              type="submit"
              disabled={isSaving}
              className="px-8 py-2.5 rounded-lg font-bold text-sm bg-primary text-white hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50"
            >
               {isSaving ? 'Creando...' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
