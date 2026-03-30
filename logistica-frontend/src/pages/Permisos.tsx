import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';

interface Permission {
  id: string;
  clave: string;
  descripcion: string;
  roles?: string[];
}

const CATEGORY_MAP: Record<string, string> = {
  'report': 'Gestión de Reportes',
  'user': 'Gestión de Usuarios',
  'insured': 'Aseguradoras',
  'worker': 'Trabajadores',
  'rbac': 'Seguridad RBAC',
  'role': 'Gestión de Roles',
  'permission': 'Lista de Permisos',
  'assign': 'Asignación',
  'remove': 'Remoción',
};

const ACTION_COLORS: Record<string, string> = {
  'create': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  'edit': 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  'delete': 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  'list': 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  'view': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400',
  'roles': 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
  'permissions': 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400',
  'export': 'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-400',
};

export default function Permisos() {
  const [permisos, setPermisos] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch permissions
      const { data: permsData, error: permsError } = await supabase
        .from('permisos')
        .select('*')
        .order('clave');
      if (permsError) throw permsError;

      // 2. Fetch roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('id, nombre');
      if (rolesError) throw rolesError;

      // 3. Fetch links
      const { data: linksData, error: linksError } = await supabase
        .from('permisos_roles')
        .select('permiso_id, rol_id');
      if (linksError) throw linksError;

      // Map role names to permissions
      const roleMap: Record<string, string> = {};
      (rolesData || []).forEach(r => { roleMap[r.id] = r.nombre; });

      const permLinks: Record<string, string[]> = {};
      (linksData || []).forEach(link => {
        if (!permLinks[link.permiso_id]) permLinks[link.permiso_id] = [];
        if (roleMap[link.rol_id]) {
          permLinks[link.permiso_id].push(roleMap[link.rol_id]);
        }
      });

      const finalPerms = (permsData || []).map(p => ({
        ...p,
        roles: permLinks[p.id] || []
      }));

      setPermisos(finalPerms);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    const cats = new Set<string>();
    permisos.forEach(p => {
      const prefix = p.clave.split('.')[0];
      if (prefix) cats.add(prefix);
    });
    return Array.from(cats).sort();
  }, [permisos]);

  const filteredPermisos = useMemo(() => {
    return permisos.filter(p => {
      const matchesSearch = p.clave.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.descripcion.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'all' || p.clave.startsWith(activeCategory + '.');
      return matchesSearch && matchesCategory;
    });
  }, [permisos, searchQuery, activeCategory]);

  const getActionColor = (clave: string) => {
    const action = clave.split('.')[1];
    return ACTION_COLORS[action] || 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100">
      {/* Header */}
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 flex items-center justify-between sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary transition-all placeholder:text-slate-400 outline-none" 
              placeholder="Buscar por clave de permiso o descripción..." 
              type="text"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <span className="material-symbols-outlined">notifications</span>
          </button>
        </div>
      </header>

      {/* Page Content */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6 max-w-7xl mx-auto w-full">
        
        {/* Breadcrumbs & Actions */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">Lista de Permisos</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Control de acceso granular y seguridad del sistema por roles.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={fetchData}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 shadow-md shadow-primary/20 transition-all"
            >
              <span className="material-symbols-outlined text-xl">refresh</span>
              Actualizar
            </button>
          </div>
        </div>
        
        {/* Categories Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-800">
          <nav className="flex gap-6 overflow-x-auto no-scrollbar scroll-smooth">
            <button 
              onClick={() => setActiveCategory('all')}
              className={`pb-4 text-sm font-bold whitespace-nowrap transition-all border-b-2 ${activeCategory === 'all' ? 'text-primary border-primary' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
            >
              Todos los Permisos
            </button>
            {categories.map(cat => (
              <button 
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`pb-4 text-sm font-bold whitespace-nowrap transition-all border-b-2 ${activeCategory === cat ? 'text-primary border-primary' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
              >
                {CATEGORY_MAP[cat] || cat.toUpperCase()}
              </button>
            ))}
          </nav>
        </div>
        
        {/* Permissions Table Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-16 text-center">No</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nombre de la Clave</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Descripción del Permiso</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Roles Asignados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <span className="text-sm font-medium text-slate-500">Cargando permisos del sistema...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredPermisos.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic font-medium">
                      No se encontraron permisos que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredPermisos.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 text-center font-medium">
                        {(idx + 1).toString().padStart(2, '0')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border shadow-sm font-mono transition-colors ${getActionColor(p.clave).replace('bg-', 'border-').replace('100', '200')} ${getActionColor(p.clave)}`}>
                          {p.clave}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-md">
                        {p.descripcion}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {p.roles && p.roles.length > 0 ? (
                            p.roles.map(role => (
                              <span key={role} className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight ${role === 'Administrador' ? 'bg-red-100 text-red-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                {role}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Ningún rol</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/30">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Mostrando <span className="text-slate-900 dark:text-white font-bold">{filteredPermisos.length}</span> permisos de un total de <span className="text-slate-900 dark:text-white font-bold">{permisos.length}</span> detectados en el sistema.
            </p>
          </div>
        </div>
        
        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="size-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-[24px]">verified</span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Capacidades Totales</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{permisos.length}</p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="size-12 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-[24px]">group</span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Categorías</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{categories.length}</p>
            </div>
          </div>
          
          <div className="bg-slate-900 dark:bg-primary/90 p-5 rounded-xl text-white shadow-lg relative overflow-hidden group">
            <div className="relative z-10">
              <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider mb-1">Integridad del Sistema</p>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400">check_circle</span>
                <span className="text-sm font-bold uppercase">Sincronizado</span>
              </div>
            </div>
            <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-[80px] opacity-10 leading-none group-hover:scale-110 transition-transform duration-500">security</span>
          </div>
        </div>

      </div>
    </div>
  );
}
