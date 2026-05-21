import { useEffect, useState } from 'react';
import { NavLink, Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, CalendarClock, Briefcase, UserPlus,
  Shield, Key, Database, ClipboardList, Settings, LogOut,
  ListChecks, Menu, X
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{ nombre_completo: string; rol: string } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (!session) navigate('/login');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) navigate('/login');
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (session?.user?.id) {
      supabase
        .from('perfiles')
        .select('nombre_completo, roles(nombre)')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setUserProfile({
              nombre_completo: data.nombre_completo || 'Usuario',
              rol: (data.roles as any)?.nombre || 'Sin rol'
            });
          }
        });
    }
  }, [session]);

  // Close sidebar on navigation (mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location]);

  if (loading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-gray-50 text-blue-600 font-bold">Cargando sistema...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-center p-4 border-b border-gray-200">
            <img
              src="/logo_fernaguez_blk.png"
              alt="Logística Fernaguez"
              className="h-10 w-auto object-contain"
            />
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* User Profile */}
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-slate-900 truncate min-w-0">
                {userProfile?.nombre_completo || session?.user?.email || 'Usuario'}
              </p>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-slate-500 uppercase tracking-wider truncate mt-0.5">
              {userProfile?.rol || 'Cargando...'}
            </p>
          </div>

          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                  isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-600 hover:bg-slate-50'
                }`
              }
            >
              <LayoutDashboard className="w-5 h-5 mr-3" />
              Dashboard Principal
            </NavLink>

            <div className="pt-6 pb-2">
              <p className="px-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                Operaciones
              </p>
            </div>

            <NavLink
              to="/calendario"
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                  isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-600 hover:bg-slate-50'
                }`
              }
            >
              <CalendarClock className="w-5 h-5 mr-3" />
              Calendario Reportes
            </NavLink>
            
            <NavLink
              to="/ordenes"
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                  isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-600 hover:bg-slate-50'
                }`
              }
            >
              <ClipboardList className="w-5 h-5 mr-3" />
              Órdenes de Trabajo
            </NavLink>
            
             <NavLink
              to="/liquidaciones"
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                  isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-600 hover:bg-slate-50'
                }`
              }
            >
              <Briefcase className="w-5 h-5 mr-3" />
              Liquidaciones
            </NavLink>

            <div className="pt-6 pb-2">
              <p className="px-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                Administración
              </p>
            </div>

            <NavLink
              to="/usuarios"
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                  isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-600 hover:bg-slate-50'
                }`
              }
            >
              <Users className="w-5 h-5 mr-3" />
              Usuarios
            </NavLink>

            <NavLink
              to="/trabajadores"
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                  isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-600 hover:bg-slate-50'
                }`
              }
            >
              <UserPlus className="w-5 h-5 mr-3" />
              Trabajadores
            </NavLink>

            <NavLink
              to="/aseguradoras"
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                  isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-600 hover:bg-slate-50'
                }`
              }
            >
              <Users className="w-5 h-5 mr-3" />
              Clientes
            </NavLink>

            <NavLink
              to="/tareas-frecuentes"
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                  isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-600 hover:bg-slate-50'
                }`
              }
            >
              <ListChecks className="w-5 h-5 mr-3" />
              Tareas Frecuentes
            </NavLink>

            <div className="pt-6 pb-2">
              <p className="px-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                Sistema
              </p>
            </div>

            <NavLink
              to="/roles"
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                  isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-600 hover:bg-slate-50'
                }`
              }
            >
              <Shield className="w-5 h-5 mr-3" />
              Gestión de Roles
            </NavLink>

            <NavLink
              to="/permisos"
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                  isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-600 hover:bg-slate-50'
                }`
              }
            >
              <Key className="w-5 h-5 mr-3" />
              Lista de Permisos
            </NavLink>

            <NavLink
              to="/rbac"
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                  isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-600 hover:bg-slate-50'
                }`
              }
            >
              <Settings className="w-5 h-5 mr-3" />
              Panel RBAC
            </NavLink>

            <NavLink
              to="/bd"
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                  isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-600 hover:bg-slate-50'
                }`
              }
            >
              <Database className="w-5 h-5 mr-3" />
              Gestión BD
            </NavLink>

            <NavLink
              to="/configuracion"
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                  isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-600 hover:bg-slate-50'
                }`
              }
            >
              <Settings className="w-5 h-5 mr-3" />
              Configuración
            </NavLink>

          </nav>

          {/* Footer */}
          <div className="p-3 border-t border-gray-100 bg-gray-50/50">
            <a
              href="https://vielhacomputer.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 group"
            >
              <img
                src="/vielha-computer-logo.png"
                alt="Vielha Computer"
                className="h-5 w-auto object-contain opacity-60 group-hover:opacity-100 transition-opacity"
              />
              <span className="text-[10px] text-slate-400 group-hover:text-slate-600 transition-colors leading-tight">
                Desarrollado por<br />Vielha Computer
              </span>
            </a>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Top Bar */}
        <header className="lg:hidden h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 text-slate-600"
          >
            <Menu className="w-6 h-6" />
          </button>
          <img
            src="/logo_fernaguez_blk.png"
            alt="Logística Fernaguez"
            className="h-7 w-auto object-contain"
          />
          <div className="w-10"></div> {/* Spacer for symmetry */}
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-hidden relative">
          <div className="h-full overflow-y-auto">
            <Outlet />
          </div>
        </main>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
};

export default Layout;
