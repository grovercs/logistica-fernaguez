import { Outlet, Navigate, useLocation } from 'react-router-dom';

const MobileLayout = () => {
    const location = useLocation();
    const isLoginPage = location.pathname === '/m/login';

    // In a real app, this would check real auth state
    const isAuthenticated = true; 

    if (!isAuthenticated && !isLoginPage) {
        return <Navigate to="/m/login" replace />;
    }

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
            {/* Solo mostramos la barra superior móvil si no estamos en el login */}
            {!isLoginPage && (
                <header className="bg-primary text-white shadow-md sticky top-0 z-20">
                    <div className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[24px]">construction</span>
                            <h1 className="font-bold text-lg leading-none">Fernaguez</h1>
                        </div>
                        <button className="p-1 rounded-full hover:bg-white/20 transition-colors">
                            <span className="material-symbols-outlined text-[24px]">menu</span>
                        </button>
                    </div>
                </header>
            )}

            {/* Contenido Principal Móvil */}
            <main className="flex-1 w-full bg-slate-50 dark:bg-slate-900 relative">
                <Outlet />
            </main>

            {/* Navegación Inferior (Opcional - solo para trabajadores logueados) */}
            {!isLoginPage && (
                <nav className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-800 sticky bottom-0 z-20 pb-safe">
                    <div className="flex items-center justify-around px-2 py-2">
                        <button className="flex flex-col items-center gap-1 p-2 text-primary">
                            <span className="material-symbols-outlined text-[24px]">assignment</span>
                            <span className="text-[10px] font-semibold">Órdenes</span>
                        </button>
                        <button className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                            <span className="material-symbols-outlined text-[24px]">schedule</span>
                            <span className="text-[10px] font-semibold">Fichajes</span>
                        </button>
                        <button className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                            <span className="material-symbols-outlined text-[24px]">person</span>
                            <span className="text-[10px] font-semibold">Perfil</span>
                        </button>
                    </div>
                </nav>
            )}
        </div>
    );
};

export default MobileLayout;
