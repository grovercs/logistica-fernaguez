import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { supabaseAdmin } from '../lib/supabase-admin';
import AltaUsuarioModal from '../components/modals/AltaUsuarioModal';
import EditarUsuarioModal from '../components/modals/EditarUsuarioModal';

const ROLE_COLORS: Record<string, string> = {
  'Administrador': 'bg-primary/10 text-primary border-primary/20',
  'Editor': 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
  'Trabajador': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
  'Visualizador': 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-500/30',
};

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
        const [profilesReq, rolesReq, authUsersReq] = await Promise.all([
            supabase.from('perfiles').select('*, roles(*)'),
            supabase.from('roles').select('*'),
            supabaseAdmin.auth.admin.listUsers()
        ]);

        if (profilesReq.data && authUsersReq.data?.users) {
            const authMap = new Map(authUsersReq.data.users.map(u => [u.id, u.email]));
            const combined = profilesReq.data.map(p => ({
                ...p,
                email: authMap.get(p.id) || 'Sin email'
            }));
            setUsuarios(combined);
        }
        
        if (rolesReq.data) setRoles(rolesReq.data);
    } catch (err) {
        console.error('Error fetching users:', err);
    } finally {
        setLoading(false);
    }
  };

  const toggleStatus = async (user: any) => {
    const { error } = await supabase
      .from('perfiles')
      .update({ activo: !user.activo })
      .eq('id', user.id);

    if (!error) fetchData();
  };

  const deleteUser = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este perfil? Esto no eliminará el usuario de Auth, pero le quitará sus permisos.')) return;
    
    const { error } = await supabase.from('perfiles').delete().eq('id', id);
    if (!error) fetchData();
  };

  const filteredUsuarios = usuarios.filter(u => 
    u.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 h-full">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 w-full backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center px-4 sm:px-8 h-16">
          <div className="relative w-full max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl pointer-events-none">search</span>
            <input 
               className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary/50 outline-none rounded-xl text-sm transition-all placeholder:text-slate-400" 
               placeholder="Buscar usuarios..." 
               type="text"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>
      
      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-7xl mx-auto w-full">
        
        {/* Title & Action */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Gestión de Usuarios</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Administra los accesos y permisos de la plataforma.</p>
          </div>
          <button 
             onClick={() => setIsAddModalOpen(true)}
             className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-xs rounded-xl transition-all shadow-lg shadow-primary/20 shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Añadir Usuario
          </button>
        </div>
        
        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-slate-500 text-sm font-medium">Total Perfiles</p>
            <p className="text-2xl font-bold mt-1">{usuarios.length}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-slate-500 text-sm font-medium">Activos</p>
            <p className="text-2xl font-bold mt-1 text-emerald-500">{usuarios.filter(u => u.activo).length}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-slate-500 text-sm font-medium">Inactivos</p>
            <p className="text-2xl font-bold mt-1 text-red-500">{usuarios.filter(u => !u.activo).length}</p>
          </div>
        </div>
        
        {/* Table Container */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-4 sm:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuario</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden lg:table-cell">Email</th>
                  <th className="px-4 sm:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Rol</th>
                  <th className="px-4 sm:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center hidden sm:table-cell">Estado</th>
                  <th className="px-4 sm:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-bold animate-pulse">Cargando perfiles...</td></tr>
                ) : filteredUsuarios.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic font-medium">No se encontraron usuarios.</td></tr>
                ) : filteredUsuarios.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-[10px] shrink-0 border border-primary/20">
                                  {u.nombre_completo?.substring(0, 2).toUpperCase() || '??'}
                              </div>
                              <div>
                                  <span className="text-sm font-bold text-slate-900 dark:text-white block truncate max-w-[120px] sm:max-w-none">{u.nombre_completo || 'Sin nombre'}</span>
                                  <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">ID: {u.id.substring(0, 8)}</span>
                              </div>
                            </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-medium hidden lg:table-cell">
                            {u.email}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${
                                ROLE_COLORS[u.roles?.nombre || ''] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 border-slate-200'
                            }`}>
                                {u.roles?.nombre || 'Sin rol'}
                            </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-center hidden sm:table-cell">
                            <button 
                                onClick={() => toggleStatus(u)}
                                className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${
                                    u.activo ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                                }`}
                            >
                            <span className={`size-1.5 rounded-full ${u.activo ? 'bg-emerald-500' : 'bg-slate-400 shadow-sm'}`}></span>
                            {u.activo ? 'Activo' : 'Inactivo'}
                            </button>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm">
                            <div className="flex items-center justify-end gap-1.5">
                              <button 
                                  onClick={() => {
                                      setSelectedUsuario(u);
                                      setIsEditModalOpen(true);
                                  }}
                                  className="size-8 flex items-center justify-center text-slate-400 hover:text-primary transition-all hover:bg-primary/10 rounded-lg" title="Editar">
                                  <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>
                              <button 
                                  onClick={() => deleteUser(u.id)}
                                  className="size-8 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Eliminar">
                                  <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </div>
                        </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
      
      <AltaUsuarioModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        onCreated={fetchData} 
      />

      <EditarUsuarioModal 
        isOpen={isEditModalOpen}
        onClose={() => {
            setIsEditModalOpen(false);
            setSelectedUsuario(null);
        }}
        usuario={selectedUsuario}
        roles={roles}
        onUpdated={fetchData}
      />
    </div>
  );
}
