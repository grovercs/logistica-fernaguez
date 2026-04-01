import { useEffect, useState } from 'react';
import { NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, CalendarClock, Briefcase, UserPlus, Shield, Key, Database, ClipboardList, Settings, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

const Layout = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-center p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-blue-600">Fernaguez</h1>
          </div>
          
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <LayoutDashboard className="w-5 h-5 mr-3" />
              Dashboard Principal
            </NavLink>

            <div className="pt-4 pb-2">
              <p className="px-4 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                Operaciones
              </p>
            </div>

            <NavLink
              to="/calendario"
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <CalendarClock className="w-5 h-5 mr-3" />
              Calendario Reportes
            </NavLink>
            
            <NavLink
              to="/ordenes"
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <ClipboardList className="w-5 h-5 mr-3" />
              Órdenes de Trabajo
            </NavLink>
            
             <NavLink
              to="/liquidaciones"
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <Briefcase className="w-5 h-5 mr-3" />
              Liquidaciones
            </NavLink>

            <div className="pt-4 pb-2">
              <p className="px-4 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                Administración
              </p>
            </div>

            <NavLink
              to="/usuarios"
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <Users className="w-5 h-5 mr-3" />
              Usuarios
            </NavLink>

            <NavLink
              to="/trabajadores"
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <UserPlus className="w-5 h-5 mr-3" />
              Trabajadores
            </NavLink>

            <NavLink
              to="/aseguradoras"
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <Users className="w-5 h-5 mr-3" />
              Clientes
            </NavLink>

            <div className="pt-4 pb-2">
              <p className="px-4 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                Sistema
              </p>
            </div>

            <NavLink
              to="/roles"
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <Shield className="w-5 h-5 mr-3" />
              Gestión de Roles
            </NavLink>

            <NavLink
              to="/permisos"
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <Key className="w-5 h-5 mr-3" />
              Lista de Permisos
            </NavLink>

            <NavLink
              to="/rbac"
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <Settings className="w-5 h-5 mr-3" />
              Panel RBAC
            </NavLink>

            <NavLink
              to="/bd"
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <Database className="w-5 h-5 mr-3" />
              Gestión BD
            </NavLink>

          </nav>
          
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
