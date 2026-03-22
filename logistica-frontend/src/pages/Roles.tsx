import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import NuevoRolModal from '../components/modals/NuevoRolModal';
import EditarRolModal from '../components/modals/EditarRolModal';

interface Role {
  id: string;
  nombre: string;
  descripcion: string;
  user_count?: number;
  permissions?: string[];
}

export default function Roles() {
  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
  const [isEditRoleOpen, setIsEditRoleOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<{id: string, nombre: string} | null>(null);
  
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      // 1. Fetch roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('*')
        .order('nombre');

      if (rolesError) throw rolesError;

      // 2. Fetch user counts per role
      const { data: profilesData, error: profilesError } = await supabase
        .from('perfiles')
        .select('rol_id');

      if (profilesError) throw profilesError;

      // 3. Fetch some key permissions for display
      const { data: permLinks, error: linksError } = await supabase
        .from('permisos_roles')
        .select('rol_id, permisos(clave)');

      if (linksError) throw linksError;

      // Process counts
      const counts: Record<string, number> = {};
      profilesData?.forEach(p => {
        if (p.rol_id) {
          counts[p.rol_id] = (counts[p.rol_id] || 0) + 1;
        }
      });

      // Process permissions per role
      const rolePerms: Record<string, string[]> = {};
      permLinks?.forEach((link: any) => {
        if (!rolePerms[link.rol_id]) rolePerms[link.rol_id] = [];
        if (link.permisos?.clave) {
            rolePerms[link.rol_id].push(link.permisos.clave.split('.')[1]);
        }
      });

      const rolesWithData = (rolesData || []).map(role => ({
        ...role,
        user_count: counts[role.id] || 0,
        permissions: rolePerms[role.id] || []
      }));

      setRoles(rolesWithData);
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditRole = (id: string, nombre: string) => {
    setSelectedRole({ id, nombre });
    setIsEditRoleOpen(true);
  };

  const getRoleIcon = (name: string) => {
    switch (name) {
      case 'Administrador': return { icon: 'workspace_premium', color: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' };
      case 'Editor': return { icon: 'edit_note', color: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' };
      case 'Visualizador': return { icon: 'visibility', color: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' };
      case 'Trabajador': return { icon: 'engineering', color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' };
      default: return { icon: 'groups', color: 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400' };
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 h-full">
      {/* Header */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-8 flex items-center justify-between shrink-0 sticky top-0 z-10 w-full">
        <h2 className="text-xl font-bold">Gestión de Roles</h2>
        
        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input 
               className="bg-slate-100 dark:bg-slate-800 border-none rounded-lg pl-10 pr-4 py-2 text-sm w-64 focus:ring-2 focus:ring-primary transition-all outline-none" 
               placeholder="Buscar permisos o roles..." 
               type="text"
            />
          </div>
          <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 relative transition-colors">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
          </button>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
        
        {/* Title & Action section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
                <h3 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Configuración de Niveles de Acceso</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-2xl text-lg leading-relaxed">
                    Define y administra los roles de seguridad de la plataforma. Configura permisos específicos para asegurar que cada usuario tenga acceso únicamente a lo que necesita.
                </p>
            </div>
            <button 
               onClick={() => setIsAddRoleOpen(true)}
               className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-primary/25 transition-all active:scale-95 whitespace-nowrap"
            >
                <span className="material-symbols-outlined">add</span>
                <span>Añadir Nuevo Rol</span>
            </button>
        </div>
        
        {/* Roles Table Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rol</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Descripción</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Permisos Clave</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Usuarios</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loading ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-10 text-center">
                              <div className="flex flex-col items-center gap-2">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                <span className="text-sm text-slate-500">Cargando niveles de acceso...</span>
                              </div>
                            </td>
                          </tr>
                        ) : roles.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-10 text-center text-slate-500 italic">No hay roles definidos.</td>
                          </tr>
                        ) : (
                          roles.map((role) => {
                            const { icon, color } = getRoleIcon(role.nombre);
                            return (
                              <tr key={role.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-3">
                                        <div className={`size-8 rounded-lg flex items-center justify-center ${color}`}>
                                            <span className="material-symbols-outlined text-xl">{icon}</span>
                                        </div>
                                        <span className="font-bold text-slate-900 dark:text-white">{role.nombre}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-400">{role.descripcion}</td>
                                <td className="px-6 py-5">
                                    <div className="flex flex-wrap gap-1">
                                      {role.nombre === 'Administrador' ? (
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                                            Acceso Maestro
                                        </span>
                                      ) : role.permissions && role.permissions.length > 0 ? (
                                        <>
                                          {role.permissions.slice(0, 3).map((p, i) => (
                                            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                                              {p}
                                            </span>
                                          ))}
                                          {role.permissions.length > 3 && (
                                            <span className="text-[10px] text-slate-400 font-bold ml-1">
                                              +{role.permissions.length - 3} más
                                            </span>
                                          )}
                                        </>
                                      ) : (
                                        <span className="text-[10px] text-slate-400 italic">Sin permisos asignados</span>
                                      )}
                                    </div>
                                </td>
                                <td className="px-6 py-5 text-sm font-medium">{role.user_count} {role.user_count === 1 ? 'usuario' : 'usuarios'}</td>
                                <td className="px-6 py-5 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button 
                                          onClick={() => handleEditRole(role.id, role.nombre)}
                                          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400 transition-colors" title="Editar Permisos"
                                        >
                                            <span className="material-symbols-outlined text-sm">edit</span>
                                        </button>
                                        <button className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400 transition-colors" title="Configurar Rol">
                                            <span className="material-symbols-outlined text-sm">settings</span>
                                        </button>
                                    </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
        
        {/* Stats/Capabilities Summary */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 p-6 rounded-2xl">
                <div className="flex items-center gap-3 text-primary mb-3">
                    <span className="material-symbols-outlined">account_tree</span>
                    <h4 className="font-bold">Jerarquía de Roles</h4>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">El sistema utiliza una estructura de herencia. Los roles superiores incluyen automáticamente los permisos de los inferiores.</p>
            </div>
            
            <div className="bg-slate-900 dark:bg-slate-800 text-white p-6 rounded-2xl shadow-md">
                <div className="flex items-center gap-3 mb-3 text-primary">
                    <span className="material-symbols-outlined">security_update_good</span>
                    <h4 className="font-bold">Seguridad RBAC</h4>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">Control de Acceso Basado en Roles (RBAC) activo. Actualmente auditando acciones en el sistema.</p>
            </div>
            
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
                <div className="flex items-center gap-3 text-emerald-500 mb-3">
                    <span className="material-symbols-outlined">analytics</span>
                    <h4 className="font-bold text-slate-900 dark:text-white">Métricas de Uso</h4>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {roles.reduce((acc, r) => acc + (r.user_count || 0), 0)} usuarios activos distribuidos en los {roles.length} roles principales.
                </p>
            </div>
        </div>
        
      </div>

      <NuevoRolModal 
        isOpen={isAddRoleOpen} 
        onClose={() => setIsAddRoleOpen(false)} 
        onCreated={fetchRoles}
      />

      <EditarRolModal
        isOpen={isEditRoleOpen}
        onClose={() => setIsEditRoleOpen(false)}
        roleId={selectedRole?.id || null}
        roleName={selectedRole?.nombre || null}
        onSaved={fetchRoles}
      />

    </div>
  );
}
