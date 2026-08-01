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

interface MobileWorkerAssignmentCard {
    id: string;
    id_legible: string;
    estado: string;
    cliente: string | null;
    direccion: string | null;
    tecnico_id: string | null;
    fecha_programada: string | null;
    orden_creado_en: string | null;
    asignacion_id: string;
    orden_id: string;
    fecha_asignacion: string | null;
    hora_asignacion: string | null;
    estado_asignacion: 'pendiente' | 'en_progreso';
    notas_asignacion: string | null;
    asignacion_creada_en: string | null;
}

const assignmentStatusLabel: Record<MobileWorkerAssignmentCard['estado_asignacion'], string> = {
    pendiente: 'Pendiente',
    en_progreso: 'En curso',
};

const parseLocalDate = (value: string | null | undefined) => {
    if (!value) return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
};

const formatLocalDate = (value: string | null | undefined) => {
    const date = parseLocalDate(value);
    return date ? date.toLocaleDateString('es-ES') : 'Sin fecha';
};

const isCreatedToday = (value: string | null | undefined) => {
    if (!value) return false;
    const created = new Date(value);
    if (Number.isNaN(created.getTime())) return false;
    const today = new Date();
    return created.getFullYear() === today.getFullYear()
        && created.getMonth() === today.getMonth()
        && created.getDate() === today.getDate();
};

const MobileOrdenes = () => {
    const navigate = useNavigate();
    const [ordenes, setOrdenes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
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
    const fetchOrdenes = async (userId: string, roleName: string) => {
        setLoadError(null);

        if (roleName === 'Trabajador') {
            // RLS limits this query to the authenticated worker's own assignments.
            // The assignment is the source of truth for the worker's active work list.
            const { data, error } = await supabase
                .from('orden_asignaciones')
                .select(`
                    id,
                    orden_id,
                    trabajador_id,
                    fecha_asignacion,
                    hora_programada,
                    estado,
                    notas,
                    creado_en,
                    orden:ordenes!inner (
                        id,
                        id_legible,
                        estado,
                        cliente,
                        direccion,
                        tecnico_id,
                        fecha_programada,
                        creado_en
                    )
                `)
                .in('estado', ['pendiente', 'en_progreso'])
                .neq('ordenes.estado', 'Finalizada')
                .neq('ordenes.estado', 'Papelera');

            if (error) {
                console.error('mobile_orders_assignments_load_failed', {
                    user_id_prefix: userId.slice(0, 8),
                    code: error.code ?? 'unknown',
                });
                setLoadError('No se pudieron cargar tus asignaciones');
                return;
            }

            const assignmentCards: MobileWorkerAssignmentCard[] = (data ?? [])
                .flatMap((assignment: any) => {
                    const orden = assignment.orden;
                    if (!orden) return [];
                    return [{
                        id: orden.id,
                        id_legible: orden.id_legible,
                        estado: orden.estado,
                        cliente: orden.cliente,
                        direccion: orden.direccion,
                        tecnico_id: orden.tecnico_id,
                        fecha_programada: orden.fecha_programada,
                        orden_creado_en: orden.creado_en,
                        asignacion_id: assignment.id,
                        orden_id: assignment.orden_id,
                        fecha_asignacion: assignment.fecha_asignacion,
                        hora_asignacion: assignment.hora_programada,
                        estado_asignacion: assignment.estado,
                        notas_asignacion: assignment.notas,
                        asignacion_creada_en: assignment.creado_en,
                    }];
                })
                .sort((a, b) => {
                    const assignmentDateA = parseLocalDate(a.fecha_asignacion)?.getTime() ?? 0;
                    const assignmentDateB = parseLocalDate(b.fecha_asignacion)?.getTime() ?? 0;
                    if (assignmentDateA !== assignmentDateB) return assignmentDateB - assignmentDateA;
                    if ((a.hora_asignacion ?? '') !== (b.hora_asignacion ?? '')) {
                        return (b.hora_asignacion ?? '').localeCompare(a.hora_asignacion ?? '');
                    }
                    const createdA = a.asignacion_creada_en ? new Date(a.asignacion_creada_en).getTime() : 0;
                    const createdB = b.asignacion_creada_en ? new Date(b.asignacion_creada_en).getTime() : 0;
                    if (createdA !== createdB) return createdB - createdA;
                    const orderCreatedA = a.orden_creado_en ? new Date(a.orden_creado_en).getTime() : 0;
                    const orderCreatedB = b.orden_creado_en ? new Date(b.orden_creado_en).getTime() : 0;
                    return orderCreatedB - orderCreatedA;
                });
            setOrdenes(assignmentCards);
            return;
        }

        // Administrative and viewer behavior remains unchanged; RLS still controls access.
        const { data, error } = await supabase
            .from('ordenes')
            .select('*')
            .neq('estado', 'Finalizada')
            .neq('estado', 'Papelera')
            .order('creado_en', { ascending: false });

        if (error) {
            setLoadError('No se pudieron cargar las órdenes');
            return;
        }
        setOrdenes(data ?? []);
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

    const filteredOrdenes = ordenes.filter(o => {
        if (!filterWorkerId) return true;
        return o.tecnico_id === filterWorkerId || workersList.find(w => w.id === filterWorkerId)?.auth_user_id === o.tecnico_id;
    });

    // Worker cards were already sorted by assignment timing in fetchOrdenes.
    const displayOrdenes = currentUserRole === 'Trabajador'
        ? filteredOrdenes
        : filteredOrdenes.sort((a, b) => {
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
                ) : loadError ? (
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl text-center text-slate-500 dark:text-slate-400 shadow-sm border border-red-200 dark:border-red-900/50 space-y-3">
                        <p>{loadError}</p>
                        <button type="button" onClick={refreshData} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold">
                            Reintentar
                        </button>
                    </div>
                ) : displayOrdenes.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl text-center text-slate-500 dark:text-slate-400 shadow-sm border border-slate-200 dark:border-slate-700">
                        {filterWorkerId ? 'Este técnico no tiene órdenes.' : 'No tienes órdenes asignadas.'}
                    </div>
                ) : (
                    displayOrdenes.map(orden => {
                        const isLastActive = orden.id === lastActiveId;
                        const isWorkerAssignment = currentUserRole === 'Trabajador' && Boolean(orden.asignacion_id);
                        const isNewAssignment = isWorkerAssignment && isCreatedToday(orden.asignacion_creada_en);
                        return (
                            <Link 
                                to={`/m/ordenes/${orden.id}`} 
                                key={orden.asignacion_id || orden.id}
                                className={`block bg-white dark:bg-slate-900 rounded-xl shadow-sm border p-4 active:scale-[0.98] transition-all relative overflow-hidden ${isLastActive ? 'border-primary border-l-[6px] ring-2 ring-primary/5 shadow-md' : 'border-slate-200 dark:border-slate-700'}`}
                            >
                                {isNewAssignment ? (
                                    <div className="absolute top-0 right-0 bg-primary text-white text-[8px] font-black px-2 py-0.5 rounded-bl uppercase tracking-tighter">
                                        NUEVA ASIGNACIÓN
                                    </div>
                                ) : isLastActive && (
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
                                    }
                                    return null;
                                })()}

                                {isWorkerAssignment && (
                                    <div className="mt-3 rounded-lg border border-primary/15 bg-primary/5 dark:bg-primary/10 p-3 space-y-2">
                                        <p className="text-xs font-black text-primary">
                                            Tu asignación: {formatLocalDate(orden.fecha_asignacion)} · {orden.hora_asignacion || '--:--'}
                                        </p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                            Estado de tu asignación: {assignmentStatusLabel[orden.estado_asignacion as keyof typeof assignmentStatusLabel]}
                                        </p>
                                        {orden.notas_asignacion?.trim() && (
                                            <div className="pt-2 border-t border-primary/10">
                                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Instrucciones</p>
                                                <p className="mt-1 text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{orden.notas_asignacion}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {orden.direccion && (
                                    <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300 mt-3 flex items-start gap-1.5 leading-tight">
                                        <span className="material-symbols-outlined text-[16px] text-primary shrink-0">location_on</span>
                                        {orden.direccion}
                                    </p>
                                )}

                                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[16px]">event</span> 
                                        {isWorkerAssignment
                                            ? `Fecha original de la obra: ${formatLocalDate(orden.fecha_programada)}`
                                            : (() => {
                                                if (!orden.fecha_programada) return 'S/F';
                                                const d = new Date(orden.fecha_programada);
                                                return isNaN(d.getTime()) ? 'S/F' : d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
                                            })()}
                                    </p>
                                    <p className="text-[11px] font-black text-primary bg-primary/10 dark:bg-primary/20 px-2 py-1 rounded-md flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[16px]">schedule</span> 
                                        {(isWorkerAssignment ? orden.hora_asignacion : orden.hora_programada) || '--:--'}
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
