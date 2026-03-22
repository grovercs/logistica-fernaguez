import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const MobileOrdenes = () => {
    const navigate = useNavigate();
    const [ordenes, setOrdenes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserName, setCurrentUserName] = useState<string>('');
    const [currentUserEmail, setCurrentUserEmail] = useState<string>('');

    useEffect(() => {
        const init = async () => {
            // Get logged-in user info
            const { data: userData } = await supabase.auth.getUser();
            const userId = userData?.user?.id || null;
            setCurrentUserEmail(userData?.user?.email || '');

            if (userId) {
                const { data: trabData } = await supabase
                    .from('trabajadores')
                    .select('nombre, apellidos')
                    .eq('auth_user_id', userId)
                    .maybeSingle();
                if (trabData) {
                    setCurrentUserName(`${trabData.nombre} ${trabData.apellidos}`.trim());
                }
            }

            // Fetch all relevant orders
            const { data, error } = await supabase
                .from('ordenes')
                .select('*')
                .order('creado_en', { ascending: false });
            
            if (!error && data) {
                setOrdenes(data);
            }
            setLoading(false);
        };
        init();
    }, []);

    const handleLogout = async () => {
        if (window.confirm('¿Cerrar sesión?')) {
            await supabase.auth.signOut();
            navigate('/m/login');
        }
    };

    return (
        <div className="pb-24 font-sans bg-[#f0f2f5] min-h-[100dvh]">
            {/* User Header */}
            <div className="bg-white shadow-sm px-4 py-3 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-sm uppercase shrink-0">
                        {currentUserName ? currentUserName.charAt(0) : '?'}
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-800 leading-tight">
                            {currentUserName || currentUserEmail || 'Técnico'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">Técnico de Campo</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 text-slate-500 hover:text-red-500 transition-colors text-xs font-bold px-2 py-1 rounded-lg hover:bg-red-50"
                >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    Salir
                </button>
            </div>

            <div className="p-4 space-y-4">
                <h2 className="text-xl font-bold text-slate-800 mt-2">Órdenes de Trabajo</h2>
                
                {loading ? (
                    <div className="text-center text-slate-500 py-8">Cargando órdenes...</div>
                ) : ordenes.length === 0 ? (
                    <div className="bg-white p-6 rounded-xl text-center text-slate-500 shadow-sm border border-slate-200">
                        No tienes órdenes asignadas.
                    </div>
                ) : (
                    ordenes.map(orden => (
                        <Link to={`/m/ordenes/${orden.id}`} key={orden.id} className="block bg-white rounded-xl shadow-sm border border-slate-200 p-4 active:scale-[0.98] transition-all">
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-bold text-primary">{orden.id_legible}</span>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${orden.estado === 'En Curso' ? 'bg-primary/10 text-primary' : orden.estado === 'Pendiente' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                    {orden.estado}
                                </span>
                            </div>
                            <h3 className="font-semibold text-slate-800">{orden.cliente}</h3>
                            {orden.direccion && (
                                <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[13px]">location_on</span>
                                    {orden.direccion}
                                </p>
                            )}
                            <p className="text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-100 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">schedule</span> 
                                {new Date(orden.creado_en).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
};

export default MobileOrdenes;
