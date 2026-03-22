import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg('');
        
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        setIsLoading(false);

        if (error) {
            setErrorMsg(error.message === 'Invalid login credentials' 
                ? 'Correo o contraseña incorrectos' 
                : error.message);
        } else {
            navigate('/');
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
                <div className="bg-blue-50 p-8 text-center border-b border-blue-100">
                    <div className="mx-auto bg-blue-600 size-16 rounded-2xl flex items-center justify-center text-white mb-4 shadow-md shadow-blue-600/20">
                        <span className="material-symbols-outlined text-[32px]">admin_panel_settings</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Logística Fernaguez</h1>
                    <p className="text-sm text-slate-500 mt-1">Panel de Administración</p>
                </div>
                
                <div className="p-8">
                    {errorMsg && (
                        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-lg text-center font-semibold">
                            {errorMsg}
                        </div>
                    )}
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1.5">
                                Correo Electrónico
                            </label>
                            <input 
                                type="email"
                                required
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                placeholder="admin@logisticafernaguez.es"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1.5">
                                Contraseña
                            </label>
                            <input 
                                type="password"
                                required
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <button 
                            type="submit"
                            disabled={isLoading}
                            className={`w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/30 hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 transition-all flex items-center justify-center gap-2 mt-4 ${isLoading ? 'opacity-75 cursor-wait' : ''}`}
                        >
                            <span>{isLoading ? 'Verificando...' : 'Acceder al Panel'}</span>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
