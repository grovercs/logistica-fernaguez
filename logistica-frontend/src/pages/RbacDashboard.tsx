import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { supabaseAdmin } from '../lib/supabase-admin';

interface UserRole {
  id: string;
  email: string | null;
  nombre: string | null;
  role: string | null;
  roleId: string | null;
}

const ROLE_COLORS: Record<string, string> = {
  'Administrador': 'bg-primary/10 text-primary border-primary/20',
  'Editor': 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
  'Trabajador': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
  'Visualizador': 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-500/30',
};

const ROLE_ICONS: Record<string, string> = {
  'Administrador': 'workspace_premium',
  'Editor': 'edit_note',
  'Trabajador': 'engineering',
  'Visualizador': 'visibility',
};

export default function RbacDashboard() {
  const [users, setUsers] = useState<UserRole[]>([]);
  const [roles, setRoles] = useState<{id: string, nombre: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch profiles and roles
      const { data: profiles, error: pError } = await supabase
        .from('perfiles')
        .select('id, nombre, rol_id, roles(nombre)');
      if (pError) throw pError;

      const { data: rolesData, error: rError } = await supabase
        .from('roles')
        .select('id, nombre');
      if (rError) throw rError;
      setRoles(rolesData || []);

      // 2. Fetch emails using Admin API
      const { data: { users: authUsers }, error: aError } = await supabaseAdmin.auth.admin.listUsers();
      if (aError) throw aError;

      const emailMap = new Map(authUsers.map(u => [u.id, u.email]));

      // 3. Merge
      const merged = (profiles || []).map(p => ({
        id: p.id,
        nombre: p.nombre,
        email: emailMap.get(p.id) || 'N/A',
        roleId: p.rol_id,
        role: (p.roles as any)?.nombre || 'Sin Rol'
      }));

      setUsers(merged);
    } catch (error) {
      console.error('Error fetching RBAC data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRoleId: string) => {
    setUpdatingId(userId);
    try {
      const { error } = await supabase
        .from('perfiles')
        .update({ rol_id: newRoleId })
        .eq('id', userId);

      if (error) throw error;
      
      // Update local state
      const roleName = roles.find(r => r.id === newRoleId)?.nombre || 'Desconocido';
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, roleId: newRoleId, role: roleName } : u));
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Error al actualizar el rol');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100">
      {/* Header */}
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 flex items-center justify-between sticky top-0 z-10 shrink-0">
        <h2 className="text-xl font-bold">Panel de Seguridad RBAC</h2>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">Mapa de Acceso de Usuarios</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">Asigna roles y gestiona permisos del personal desde una vista centralizada.</p>
          </div>
          <div className="flex gap-3">
             <a href="/usuarios" className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                Gestionar Usuarios
             </a>
             <a href="/trabajadores" className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                Gestionar Trabajadores
             </a>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-slate-500 font-medium">Cargando mapa de usuarios...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {users.map(u => (
              <div key={u.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all group flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`size-12 rounded-xl flex items-center justify-center text-white text-xl font-black bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/20`}>
                      {u.nombre?.[0] || 'U'}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{u.nombre || 'Sin nombre'}</h4>
                      <p className="text-xs text-slate-400 font-medium">{u.email}</p>
                    </div>
                  </div>
                  <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight border shadow-sm ${ROLE_COLORS[u.role || ''] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    <span className="material-symbols-outlined text-sm">{ROLE_ICONS[u.role || ''] || 'person'}</span>
                    {u.role}
                  </span>
                </div>

                <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Asignar Nuevo Rol</label>
                    <div className="flex gap-2">
                      <select 
                        disabled={updatingId === u.id}
                        value={u.roleId || ''}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary outline-none transition-all disabled:opacity-50 appearance-none"
                      >
                        <option value="" disabled>Seleccionar Rol</option>
                        {roles.map(r => (
                          <option key={r.id} value={r.id}>{r.nombre}</option>
                        ))}
                      </select>
                      {updatingId === u.id && (
                        <div className="size-9 bg-primary/10 rounded-lg flex items-center justify-center">
                          <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-slate-900 dark:bg-slate-800 rounded-2xl p-8 text-white relative overflow-hidden shadow-xl shadow-slate-900/10">
           <div className="relative z-10 max-w-2xl">
              <div className="flex items-center gap-3 text-primary mb-4">
                 <span className="material-symbols-outlined">security</span>
                 <h4 className="font-bold text-xl">Gestión de Integridad</h4>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Cada cambio de rol es auditado y se aplica en tiempo real. Los usuarios deberán recargar su sesión para que los nuevos permisos surtan efecto en todas las pestañas abiertas.
              </p>
           </div>
           <span className="material-symbols-outlined absolute -right-8 -bottom-8 text-[160px] opacity-5 pointer-events-none">shield_person</span>
        </div>
      </div>
    </div>
  );
}
