import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { notifyNewOrder } from '../lib/whatsapp';

interface Asignacion {
  id: string;
  orden_id: string;
  trabajador_id: string;
  trabajador?: {
    nombre: string;
    apellidos: string;
    telefono?: string;
  };
  fecha_asignacion: string;
  hora_programada: string;
  estado: string;
  notas: string;
  creado_en: string;
}

interface Props {
  ordenId: string;
  orden?: any; // Objeto de la orden para las notificaciones
  onUpdate?: () => void;
}

export default function AsignacionesSection({ ordenId, orden, onUpdate }: Props) {
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [trabajadores, setTrabajadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formTrabajador, setFormTrabajador] = useState('');
  const [formFecha, setFormFecha] = useState(new Date().toLocaleDateString('en-CA'));
  const [formHora, setFormHora] = useState('10:00');
  const [formNotas, setFormNotas] = useState('');

  useEffect(() => {
    fetchAsignaciones();
    fetchTrabajadores();
  }, [ordenId]);

  const fetchAsignaciones = async () => {
    setLoading(true);
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
        creado_en
      `)
      .eq('orden_id', ordenId)
      .order('creado_en', { ascending: false });

    if (!error && data) {
      // 2. Cargamos todos los trabajadores para poder cruzar los datos
      const { data: rawTrab } = await supabase
        .from('trabajadores')
        .select('id, auth_user_id, nombre, apellidos');

      // 3. Cruzamos los datos manualmente (mucho más fiable)
      const mergedAsignaciones = (data || []).map(asig => {
        const trabajador = rawTrab?.find(t => 
          t.id === asig.trabajador_id || t.auth_user_id === asig.trabajador_id
        );
        return {
          ...asig,
          trabajador
        };
      });

      setAsignaciones(mergedAsignaciones);
    }
    setLoading(false);
  };

  const fetchTrabajadores = async () => {
    const { data } = await supabase
      .from('trabajadores')
      .select('id, auth_user_id, nombre, apellidos, telefono')
      .eq('estado', 'Disponible');
    if (data) setTrabajadores(data);
  };

  const handleAddAsignacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTrabajador) {
      alert('Selecciona un trabajador');
      return;
    }

    if (!formNotas.trim()) {
      alert('Por favor, escribe una nota o instrucción para el trabajador.');
      return;
    }

    setSaving(true);
    
    try {
      // 1. Insertamos la nueva asignación
      const { error: assignError } = await supabase
        .from('orden_asignaciones')
        .insert({
          orden_id: ordenId,
          trabajador_id: formTrabajador,
          fecha_asignacion: formFecha,
          hora_programada: formHora,
          notas: formNotas,
          estado: 'pendiente'
        });

      if (assignError) throw assignError;

      // 3. Sincronizamos la tabla principal de ordenes
      const { error: updateError } = await supabase
        .from('ordenes')
        .update({ tecnico_id: formTrabajador })
        .eq('id', ordenId);

      if (updateError) throw updateError;
      
      console.log("✅ Asignación completada con éxito");

      // NOTIFICACIÓN WHATSAPP
      const selectedWorker = trabajadores.find(t => t.auth_user_id === formTrabajador || t.id === formTrabajador);
      if (selectedWorker && selectedWorker.telefono && orden) {
        try {
           console.log("Enviando notificación WhatsApp al teléfono:", selectedWorker.telefono);
           await notifyNewOrder(selectedWorker.telefono, {
             id: ordenId, // Usamos el UUID de la orden para el deep link
             id_legible: orden.id_legible,
             cliente: orden.cliente,
             direccion: orden.direccion,
             descripcion: `${orden.descripcion}\n\n*Notas de asignación:* ${formNotas}`
           });
        } catch (wsErr) {
           console.error("Error al enviar WhatsApp:", wsErr);
        }
      }

      setSaving(false);
      setShowAddForm(false);
      setFormTrabajador('');
      setFormNotas('');
      fetchAsignaciones();
      onUpdate?.();

    } catch (error: any) {
      console.error('Error detallado en asignación:', error);
      const errorMsg = error.message || 'Error desconocido';
      const errorDetail = error.details || '';
      alert(`Error al asignar: ${errorMsg} ${errorDetail ? `(${errorDetail})` : ''}`);
      setSaving(false);
    }
  };

  const handleUpdateEstado = async (asignacionId: string, nuevoEstado: string) => {
    const { error } = await supabase
      .from('orden_asignaciones')
      .update({ estado: nuevoEstado })
      .eq('id', asignacionId);

    if (!error) {
      fetchAsignaciones();
      onUpdate?.();
    }
  };

  const handleDeleteAsignacion = async (asignacionId: string) => {
    if (!window.confirm('¿Eliminar esta asignación?')) return;

    const { error } = await supabase
      .from('orden_asignaciones')
      .delete()
      .eq('id', asignacionId);

    if (!error) {
      fetchAsignaciones();
      onUpdate?.();
    }
  };

  const handleManualWhatsApp = async (asig: Asignacion) => {
    if (!asig.trabajador?.telefono) {
      alert("El técnico asignado no tiene un teléfono configurado.");
      return;
    }

    setSaving(true);
    try {
      const result = await notifyNewOrder(asig.trabajador.telefono, {
        id: ordenId,
        id_legible: orden?.id_legible || '',
        cliente: orden?.cliente || '',
        direccion: orden?.direccion || '',
        descripcion: `${orden?.descripcion || ''}\n\n*Notas de asignación:* ${asig.notas || ''}`
      });

      if (result.sent === "true" || result.success) {
        alert("✅ Notificación reenviada a " + asig.trabajador.nombre);
      } else {
        alert("⚠️ Revisa el panel de UltraMsg, el mensaje no se pudo confirmar.");
      }
    } catch (err) {
      console.error(err);
      alert("❌ Error al conectar con WhatsApp.");
    }
    setSaving(false);
  };

  const getEstadoBadge = (estado: string) => {
    const styles: Record<string, string> = {
      pendiente: 'bg-amber-100 text-amber-700',
      en_progreso: 'bg-blue-100 text-blue-700',
      completado: 'bg-green-100 text-green-700',
      cancelado: 'bg-slate-100 text-slate-500'
    };
    return styles[estado] || 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">group_add</span>
          <h3 className="font-bold text-slate-800 dark:text-white">Asignaciones de Trabajo</h3>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Asignar
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form onSubmit={handleAddAsignacion} className="p-4 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Trabajador *</label>
              <select
                value={formTrabajador}
                onChange={(e) => setFormTrabajador(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                required
              >
                <option value="">Seleccionar...</option>
                {trabajadores.map(t => (
                  <option key={t.id} value={t.auth_user_id || t.id}>
                    {t.nombre} {t.apellidos} {t.telefono ? `(${t.telefono})` : '(Sin tel)'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha</label>
              <input
                type="date"
                value={formFecha}
                onChange={(e) => setFormFecha(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hora</label>
              <input
                type="time"
                value={formHora}
                onChange={(e) => setFormHora(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar y Notificar'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-sm font-semibold"
              >
                Cancelar
              </button>
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notas *</label>
            <input
              type="text"
              value={formNotas}
              onChange={(e) => setFormNotas(e.target.value)}
              placeholder="Instrucciones para el trabajador..."
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              required
            />
          </div>
        </form>
      )}

      {/* List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {loading ? (
          <div className="p-6 text-center text-slate-500">Cargando asignaciones...</div>
        ) : asignaciones.length === 0 ? (
          <div className="p-6 text-center text-slate-500">
            <span className="material-symbols-outlined text-3xl text-slate-300 block mb-2">person_add_disabled</span>
            Sin asignaciones. Haz clic en "Asignar" para añadir trabajadores.
          </div>
        ) : (
          asignaciones.map(asig => (
            <div key={asig.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {asig.trabajador?.nombre?.charAt(0) || '?'}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-white">
                    {asig.trabajador?.nombre} {asig.trabajador?.apellidos}
                  </p>
                  <p className="text-xs text-slate-500">
                    {asig.fecha_asignacion} {asig.hora_programada && `• ${asig.hora_programada}`}
                  </p>
                  {asig.notas && <p className="text-xs text-slate-400 italic">{asig.notas}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={asig.estado}
                  onChange={(e) => handleUpdateEstado(asig.id, e.target.value)}
                  className={`px-3 py-1 rounded-full text-xs font-bold border-0 cursor-pointer ${getEstadoBadge(asig.estado)}`}
                >
                  <option value="pendiente">⏳ Pendiente</option>
                  <option value="en_progreso">🔵 En Progreso</option>
                  <option value="completado">✅ Completado</option>
                  <option value="cancelado">❌ Cancelado</option>
                </select>
                <button
                  onClick={() => handleManualWhatsApp(asig)}
                  disabled={saving}
                  className="p-1.5 text-slate-400 hover:text-green-500 hover:bg-green-50 rounded-full transition-colors disabled:opacity-50"
                  title="Reenviar WhatsApp al técnico"
                >
                  <span className="material-symbols-outlined text-[18px]">chat</span>
                </button>
                <button
                  onClick={() => handleDeleteAsignacion(asig.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                  title="Eliminar asignación"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}