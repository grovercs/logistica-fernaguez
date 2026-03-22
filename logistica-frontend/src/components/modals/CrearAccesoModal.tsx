import React, { useState, useEffect } from 'react';
import { supabaseAdmin } from '../../lib/supabase-admin';
import { supabase } from '../../lib/supabase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
  trabajador: any;
}

export default function CrearAccesoModal({ isOpen, onClose, onCreated, trabajador }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [paso, setPaso] = useState<'form' | 'exito'>('form');
  const [credentials, setCredentials] = useState({ email: '', password: '' });

  useEffect(() => {
    if (isOpen && trabajador) {
      // Pre-fill email if available
      setEmail(trabajador.email || '');
      setPassword('');
      setPaso('form');
    }
  }, [isOpen, trabajador]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Crear usuario en Supabase Auth usando la clave de servicio
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true, // No requiere verificación de email
        user_metadata: {
          nombre_completo: `${trabajador.nombre} ${trabajador.apellidos}`,
          rol: 'tecnico'
        }
      });

      if (authError) throw authError;

      const newUserId = authData.user?.id;
      if (!newUserId) throw new Error('No se pudo obtener el ID del nuevo usuario.');

      // 2. Vincular el auth_user_id en la tabla trabajadores
      const { error: trabError } = await supabase
        .from('trabajadores')
        .update({ auth_user_id: newUserId, email: email })
        .eq('id', trabajador.id);

      if (trabError) throw trabError;

      // 3. Crear perfil en la tabla perfiles con rol Técnico
      const { data: rolData } = await supabase
        .from('roles')
        .select('id')
        .eq('nombre', 'Técnico')
        .single();

      await supabase.from('perfiles').upsert({
        id: newUserId,
        nombre_completo: `${trabajador.nombre} ${trabajador.apellidos}`,
        rol_id: rolData?.id || null,
        telefono: trabajador.telefono || null,
        activo: true
      });

      // 4. Mostrar pantalla de éxito
      setCredentials({ email, password });
      setPaso('exito');
      if (onCreated) onCreated();

    } catch (err: any) {
      console.error('Error creating access:', err);
      alert(`Error al crear el acceso: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">key</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Crear Acceso al Portal</h3>
              <p className="text-xs text-slate-500">Para: <span className="font-bold text-slate-700 dark:text-slate-300">{trabajador?.nombre} {trabajador?.apellidos}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full transition-colors">
            <span className="material-symbols-outlined block">close</span>
          </button>
        </div>

        {paso === 'form' ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Introduce el email y contraseña que usará <strong>{trabajador?.nombre}</strong> para acceder a la app móvil de técnicos.
            </p>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Email de acceso *</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tecnico@empresa.com"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Contraseña inicial *</label>
              <input
                type="text"
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Ej: Tecnico2024!"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm"
              />
              <p className="text-xs text-slate-400">Mínimo 6 caracteres. El técnico puede cambiarla después.</p>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl">
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">warning</span>
                Asegúrate de compartir las credenciales al técnico através de un canal seguro (por teléfono o en persona).
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 text-sm font-bold bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                ) : (
                  <span className="material-symbols-outlined text-[18px]">key</span>
                )}
                Crear Acceso
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 space-y-4">
            <div className="flex flex-col items-center text-center gap-3 py-2">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-green-600 text-4xl">check_circle</span>
              </div>
              <div>
                <h4 className="font-bold text-lg text-slate-900 dark:text-white">¡Acceso Creado!</h4>
                <p className="text-sm text-slate-500">{trabajador?.nombre} ya puede iniciar sesión en la app</p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Credenciales generadas:</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-slate-400 font-medium">EMAIL</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{credentials.email}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-slate-400 font-medium">CONTRASEÑA</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">{credentials.password}</p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl">
              <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                📱 El técnico debe descargar la app móvil e iniciar sesión con estas credenciales. El rol de "Técnico" ya ha sido asignado automáticamente.
              </p>
            </div>

            <button onClick={onClose} className="w-full py-2.5 text-sm font-bold bg-primary text-white rounded-xl hover:bg-primary/90 transition-all">
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
