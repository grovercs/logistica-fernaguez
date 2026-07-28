import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { notifyNewOrder } from '../../lib/notifications';
import { useUserRole } from '../../hooks/useUserRole';

interface TrabajadorDirectoryRow {
  trabajador_id: string;
  auth_user_id: string | null;
  nombre: string;
  apellidos: string;
  especialidad: string;
  estado: string;
}

interface Trabajador extends TrabajadorDirectoryRow {
  id: string;
  telefono?: string | null;
  telegram_chat_id?: string | null;
}

interface Asignacion {
  id: string;
  trabajador_id: string;
  fecha_asignacion: string;
  hora_programada: string;
  estado: string;
  notas: string;
  trabajador?: Trabajador;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  orden: any;
}

export default function RenotificarModal({ isOpen, onClose, orden }: Props) {
  const { isEditor } = useUserRole();
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (isOpen && orden) {
      fetchAsignaciones();
      setSelectedIds([]);
      setMensaje(
        `📍 *Orden:* ${orden.id_legible || orden.id}\n` +
        `👤 *Cliente:* ${orden.cliente || ''}\n` +
        `🏠 *Dirección:* ${orden.direccion || ''}\n` +
        `📝 *Trabajo:* ${orden.descripcion || ''}`
      );
    }
  }, [isOpen, orden]);

  const fetchAsignaciones = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('orden_asignaciones')
      .select('id, trabajador_id, fecha_asignacion, hora_programada, estado, notas')
      .eq('orden_id', orden.id)
      .order('creado_en', { ascending: false });

    if (data && data.length > 0) {
      const assignedWorkerIds = new Set(data.map(asignacion => asignacion.trabajador_id));
      const { data: directoryRows, error: directoryError } = await supabase
        .rpc('get_trabajadores_directory');

      if (directoryError) {
        console.error('Error cargando el directorio de trabajadores:', directoryError);
      }

      let workers: Trabajador[] = (directoryRows || [])
        .filter((row: TrabajadorDirectoryRow) => assignedWorkerIds.has(row.trabajador_id))
        .map((row: TrabajadorDirectoryRow) => ({ ...row, id: row.trabajador_id }));

      if (isEditor && workers.length > 0) {
        const { data: contactos, error: contactosError } = await supabase
          .from('trabajadores')
          .select('id, auth_user_id, telefono, telegram_chat_id')
          .in('id', workers.map(worker => worker.id));

        if (contactosError) {
          console.error('Error cargando contactos privados de trabajadores:', contactosError);
        } else {
          workers = workers.map(worker => {
            const contacto = contactos?.find(item => item.id === worker.id);
            return contacto ? { ...worker, ...contacto } : worker;
          });
        }
      }

      const merged = data.map(asig => {
        const t = workers?.find(w => w.id === asig.trabajador_id);
        return { ...asig, trabajador: t };
      });
      setAsignaciones(merged);
    } else {
      setAsignaciones([]);
    }
    setLoading(false);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSend = async () => {
    if (selectedIds.length === 0) {
      alert('Selecciona al menos un trabajador.');
      return;
    }

    const selectedWorkers = asignaciones
      .filter(a => selectedIds.includes(a.id))
      .map(a => a.trabajador)
      .filter(Boolean);

    if (selectedWorkers.length === 0) {
      alert('No se encontraron datos de los trabajadores seleccionados.');
      return;
    }

    setSending(true);
    const results: string[] = [];

    for (const worker of selectedWorkers) {
      try {
        const res = await notifyNewOrder(worker, {
          id: orden.id,
          id_legible: orden.id_legible,
          cliente: orden.cliente,
          direccion: orden.direccion,
          descripcion: mensaje,
        });
        if (res.success) {
          results.push(`✅ ${worker?.nombre}: enviado`);
        } else {
          results.push(`⚠️ ${worker?.nombre}: ${res.error || 'Error'}`);
        }
      } catch (err) {
        results.push(`❌ ${worker?.nombre}: error de red`);
      }
    }

    setSending(false);
    alert(results.join('\n'));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/30">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Re-notificar Trabajadores</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Orden: <span className="font-bold text-primary">{orden?.id_legible || orden?.id}</span></p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <span className="material-symbols-outlined block">close</span>
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Lista de trabajadores asignados */}
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Trabajadores asignados</label>
            {loading ? (
              <p className="text-sm text-slate-400">Cargando asignaciones...</p>
            ) : asignaciones.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 text-sm text-amber-700 dark:text-amber-400">
                No hay asignaciones en esta orden. Asigna un trabajador primero.
              </div>
            ) : (
              <div className="space-y-2">
                {asignaciones.map(asig => (
                  <label
                    key={asig.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedIds.includes(asig.id)
                        ? 'border-primary bg-primary/5 dark:bg-primary/10'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={selectedIds.includes(asig.id)}
                      onChange={() => toggleSelection(asig.id)}
                    />
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      selectedIds.includes(asig.id)
                        ? 'bg-primary border-primary'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {selectedIds.includes(asig.id) && (
                        <span className="material-symbols-outlined text-white text-[14px]">check</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800 dark:text-white">
                        {asig.trabajador?.nombre} {asig.trabajador?.apellidos}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {asig.estado} · {asig.fecha_asignacion} {asig.hora_programada}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Mensaje personalizado */}
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Mensaje personalizado</label>
            <textarea
              rows={5}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none font-mono"
              value={mensaje}
              onChange={e => setMensaje(e.target.value)}
            />
            <p className="text-[11px] text-slate-400 mt-1">Soporta Markdown. Ej: *negrita*, _cursiva_</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/30">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={sending || selectedIds.length === 0}
            onClick={handleSend}
            className="px-6 py-2.5 rounded-lg font-bold text-sm bg-primary text-white hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {sending ? (
              <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
            ) : (
              <span className="material-symbols-outlined text-[18px]">send</span>
            )}
            {sending ? 'Enviando...' : 'Enviar Notificación'}
          </button>
        </div>
      </div>
    </div>
  );
}
