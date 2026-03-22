import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const MobileLogin = () => {
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const navigate = useNavigate();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // En una app real, aquí se verifica con el backend
        console.log('Ingresando con', credentials);
        // Redirigir a vista de orden móvil temporalmente
        navigate('/m/ordenes/1');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-primary/5 p-8 text-center border-b border-primary/10">
                    <div className="mx-auto bg-primary size-16 rounded-2xl flex items-center justify-center text-white mb-4 shadow-md shadow-primary/20">
                        <span className="material-symbols-outlined text-[32px]">construction</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Logística Fernaguez</h1>
                    <p className="text-sm text-slate-500 mt-1">Portal del Técnico</p>
                </div>
                
                <div className="p-8">
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1.5">
                                Correo Electrónico o Usuario
                            </label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                                    person
                                </span>
                                <input 
                                    type="text"
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                    placeholder="j.perez@ejemplo.com"
                                    value={credentials.username}
                                    onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1.5">
                                Contraseña
                            </label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                                    lock
                                </span>
                                <input 
                                    type="password"
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                    placeholder="••••••••"
                                    value={credentials.password}
                                    onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                                />
                            </div>
                            <div className="flex justify-end mt-2">
                                <a href="#" className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
                                    ¿Olvidaste tu contraseña?
                                </a>
                            </div>
                        </div>

                        <button 
                            type="submit"
                            className="w-full bg-primary text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/30 hover:bg-primary/90 hover:shadow-primary/40 focus:ring-4 focus:ring-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4"
                        >
                            <span>Iniciar Sesión</span>
                            <span className="material-symbols-outlined text-[20px]">login</span>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default MobileLogin;
