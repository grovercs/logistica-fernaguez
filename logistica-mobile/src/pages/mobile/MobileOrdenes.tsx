import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface TrabajadorDirectoryRow {
    trabajador_id: string;
    auth_user_id: string | null;
    nombre: string;
    apellidos: string;
    especialidad: string;
    estado: string;
}

const MobileOrdenes = () => {
    const navigate = useNavigate();
    const [ordenes, setOrdenes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserName, setCurrentUserName] = useState<string>('');
    const [currentUserRole, setCurrentUserRole] = useState<string>('');
    const [currentUserEspecialidad, setCurrentUserEspecialidad] = useState<string>('');
    const [lastActiveId, setLastActiveId] = useState<string | null>(null);
    const [trabajadoresMap, setTrabajadoresMap] = useState<Map<string, { nombre: string; especialidad: string }>>(new Map());
    const [workersList, setWorkersList] = useState<any[]>([]);
    const [showWorkerMenu, setShowWorkerMenu] = useState(false);
    const [filterWorkerId, setFilterWorkerId] = useState<string>('');

    useEffect(() => {
        const init = async () => {
            // Get logged-in user info
            const { data: userData } = await supabase.auth.getUser();
            const userId = userData?.user?.id || null;

            if (!userId) {
                navigate('/m/login');
                return;
            }

            // Fetch User Profile and Role
            const { data: profile } = await supabase
                .from('perfiles')
                .select('nombre_completo, roles(nombre)')
                .eq('id', userId)
                .maybeSingle();

            const roleName = (profile?.roles as any)?.nombre || 'Sin rol';
            setCurrentUserRole(roleName);
            setCurrentUserName(profile?.nombre_completo || userData?.user?.email?.split('@')[0] || 'Usuario');

            // Only an actual Trabajador depends on a private worker row.
            if (roleName === 'Trabajador') {
                const { data: trabajador } = await supabase
                    .from('trabajadores')
                    .select('especialidad')
                    .eq('auth_user_id', userId)
                    .maybeSingle();

                if (trabajador?.especialidad) {
                    setCurrentUserEspecialidad(trabajador.especialidad);
                }
            }

            // Fetch all relevant orders based on role
            await fetchOrdenes(userId, roleName);

            // Fetch workers to map them
            const { data: directoryRows } = await supabase.rpc('get_trabajadores_directory');
            const workers = directoryRows?.map((w: TrabajadorDirectoryRow) => ({
                ...w,
                id: w.trabajador_id
            }));
            if (workers) {
                setWorkersList(workers);
                const map = new Map();
                workers.forEach((w: TrabajadorDirectoryRow & { id: string }) => {
                    const info = {
                        nombre: `${w.nombre} ${w.apellidos || ''}`.trim(),
                        especialidad: w.especialidad || ''
                    };
                    if (w.id) map.set(w.id, info);
                    if (w.auth_user_id) map.set(w.auth_user_id, info);
                });
                setTrabajadoresMap(map);
            }

            // Get last active order from localStorage
            setLastActiveId(localStorage.getItem('last_active_order'));
            setLoading(false);
        };
        init();
    }, []);

    // Fetch orders function - can be called to refresh
    const fetchOrdenes = async (_userId: string, _roleName: string) => {
        let query = supabase.from('ordenes').select('*');

        // Todos los trabajadores ven TODAS las órdenes
        // (Antes: solo veían las suyas)
        // Ahora pueden ver el panorama completo del trabajo

        const { data, error } = await query
            .neq('estado', 'Finalizada')
            .neq('estado', 'Papelera')
            .order('creado_en', { ascending: false });

        if (!error && data) {
            setOrdenes(data);
        }
    };

    // Refresh data when page becomes visible (returning from detail page)
    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                refreshData();
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [currentUserName]);

    const refreshData = async () => {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        if (userId) {
            await fetchOrdenes(userId, currentUserRole);
        }
    };

    const handleLogout = async () => {
        if (window.confirm('¿Cerrar sesión?')) {
            await supabase.auth.signOut();
            navigate('/m/login');
        }
    };

    const statusPriority: Record<string, number> = {
        'Urgente': 1,
        'En Curso': 2,
        'Pendiente de firma': 3,
        'En revisión': 4,
        'Pendiente': 5,
        'Finalizada': 6,
        'Cancelada': 7,
        'Archivado': 8,
    };

    const displayOrdenes = ordenes
        .filter(o => {
            if (!filterWorkerId) return true;
            return o.tecnico_id === filterWorkerId || workersList.find(w => w.id === filterWorkerId)?.auth_user_id === o.tecnico_id;
        })
        .sort((a, b) => {
            const prioA = statusPriority[a.estado] || 99;
            const prioB = statusPriority[b.estado] || 99;
            if (prioA !== prioB) return prioA - prioB;
            const timeA = a.creado_en ? new Date(a.creado_en).getTime() : 0;
            const timeB = b.creado_en ? new Date(b.creado_en).getTime() : 0;
            return timeB - timeA;
        });

    return (
        <div className="pb-24 font-sans bg-[#f0f2f5] dark:bg-slate-950 min-h-[100dvh]">
            {/* User Header */}
            <div className="bg-white dark:bg-slate-900 shadow-sm px-4 py-3 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-black text-sm uppercase shrink-0 shadow-sm">
                        {currentUserName ? currentUserName.charAt(0) : '?'}
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">
                            {currentUserName}
                        </p>
                        {currentUserEspecialidad ? (
                            <p className="text-[11px] text-primary font-bold uppercase tracking-wide flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">work</span>
                                {currentUserEspecialidad}
                            </p>
                        ) : (
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">{currentUserRole}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Menú filtro por trabajador */}
                    <div className="relative">
                        <button
                            onClick={() => setShowWorkerMenu(!showWorkerMenu)}
                            className="p-2 text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Filtrar por técnico"
                        >
                            <span className="material-symbols-outlined text-[22px]">{filterWorkerId ? 'filter_alt' : 'filter_list'}</span>
                        </button>
                        {showWorkerMenu && (
                            <>
                                <div className="fixed inset-0 z-20" onClick={() => setShowWorkerMenu(false)} />
                                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-30 overflow-hidden">
                                    <div className="p-3 max-h-80 overflow-y-auto space-y-1">
                                        <button
                                            onClick={() => { setFilterWorkerId(''); setShowWorkerMenu(false); }}
                                            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${filterWorkerId === '' ? 'bg-primary/10 text-primary' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                        >
                                            <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[10px] font-black">T</span>
                                            Todos los técnicos
                                        </button>
                                        {workersList.map((w: any) => (
                                            <button
                                                key={w.id}
                                                onClick={() => { setFilterWorkerId(w.id); setShowWorkerMenu(false); }}
                                                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${filterWorkerId === w.id ? 'bg-primary/10 text-primary' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                            >
                                                <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black uppercase">{w.nombre?.charAt(0)}</span>
                                                {w.nombre} {w.apellidos}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-red-500 transition-colors text-xs font-bold px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 dark:bg-red-900/20"
                    >
                        <span className="material-symbols-outlined text-[18px]">logout</span>
                    </button>
                </div>
            </div>

            <div className="p-4 space-y-4">
                <div className="flex items-center justify-between mt-2">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Órdenes de Trabajo</h2>
                    {filterWorkerId && (
                        <button
                            onClick={() => setFilterWorkerId('')}
                            className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-md flex items-center gap-1"
                        >
                            {trabajadoresMap.get(filterWorkerId)?.nombre || 'Filtro'}
                            <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="text-center text-slate-500 dark:text-slate-400 py-8">Cargando órdenes...</div>
                ) : displayOrdenes.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl text-center text-slate-500 dark:text-slate-400 shadow-sm border border-slate-200 dark:border-slate-700">
                        {filterWorkerId ? 'Este técnico no tiene órdenes.' : 'No tienes órdenes asignadas.'}
                    </div>
                ) : (
                    displayOrdenes.map(orden => {
                        const isLastActive = orden.id === lastActiveId;
                        return (
                            <Link 
                                to={`/m/ordenes/${orden.id}`} 
                                key={orden.id} 
                                className={`block bg-white dark:bg-slate-900 rounded-xl shadow-sm border p-4 active:scale-[0.98] transition-all relative overflow-hidden ${isLastActive ? 'border-primary border-l-[6px] ring-2 ring-primary/5 shadow-md' : 'border-slate-200 dark:border-slate-700'}`}
                            >
                                {isLastActive && (
                                    <div className="absolute top-0 right-0 bg-primary text-white text-[8px] font-black px-2 py-0.5 rounded-bl uppercase tracking-tighter">
                                        RECIENTE
                                    </div>
                                )}
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-primary">{orden.id_legible}</span>
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                                        orden.estado === 'Urgente' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                                        orden.estado === 'En revisión' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' :
                                        orden.estado === 'Pendiente de firma' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' :
                                        orden.estado === 'En Curso' ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-light' :
                                        orden.estado === 'Pendiente' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                                        'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                    }`}>
                                        {orden.estado}
                                    </span>
                                </div>
                                 <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight">{orden.cliente}</h3>
                                
                                {/* Technician Assigned */}
                                {(() => {
                                    const tecnicoInfo = trabajadoresMap.get(orden.tecnico_id);
                                    if (tecnicoInfo) {
                                        return (
                                            <div className="mt-2 flex items-center gap-2 bg-primary/5 dark:bg-primary/10 p-2 rounded-lg border border-primary/10">
                                                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-black shrink-0">
                                                    {tecnicoInfo.nombre.charAt(0)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-black text-primary uppercase leading-none">{tecnicoInfo.nombre}</span>
                                                    <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tighter mt-0.5">{tecnicoInfo.especialidad}</span>
                                                </div>
                                            </div>
                                        );
                                    } else if (orden.tecnico) {
                                        // Fallback to name string if ID mapping fails
                                        return (
                                            <div className="mt-2 flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                                <span className="material-symbols-outlined text-[16px] text-slate-400 dark:text-slate-500">person</span>
                                                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase leading-none">{orden.tecnico}</span>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}

                                {orden.direccion && (
                                    <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300 mt-3 flex items-start gap-1.5 leading-tight">
                                        <span className="material-symbols-outlined text-[16px] text-primary shrink-0">location_on</span>
                                        {orden.direccion}
                                    </p>
                                )}

                                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[16px]">event</span> 
                                        {(() => {
                                            if (!orden.fecha_programada) return 'S/F';
                                            const d = new Date(orden.fecha_programada);
                                            return isNaN(d.getTime()) ? 'S/F' : d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
                                        })()}
                                    </p>
                                    <p className="text-[11px] font-black text-primary bg-primary/10 dark:bg-primary/20 px-2 py-1 rounded-md flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[16px]">schedule</span> 
                                        {orden.hora_programada || '--:--'}
                                    </p>
                                </div>
                            </Link>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default MobileOrdenes;
