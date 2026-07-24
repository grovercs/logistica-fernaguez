import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface TareaFrecuente {
  id: string;
  nombre: string;
  descripcion: string | null;
  created_at: string;
}

export default function TareasFrecuentes() {
  const [tareas, setTareas] = useState<TareaFrecuente[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTarea, setEditingTarea] = useState<TareaFrecuente | null>(null);
  const [formData, setFormData] = useState({ nombre: '', descripcion: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTareas();
  }, []);

  const fetchTareas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tareas_frecuentes')
      .select('*')
      .order('nombre');

    if (!error && data) {
      setTareas(data);
    }
    setLoading(false);
  };

  const handleOpenModal = (tarea?: TareaFrecuente) => {
    if (tarea) {
      setEditingTarea(tarea);
      setFormData({ nombre: tarea.nombre, descripcion: tarea.descripcion || '' });
    } else {
      setEditingTarea(null);
      setFormData({ nombre: '', descripcion: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTarea(null);
    setFormData({ nombre: '', descripcion: '' });
  };

  const handleSave = async () => {
    if (!formData.nombre.trim()) {
      alert('El nombre de la tarea es obligatorio');
      return;
    }

    setSaving(true);

    if (editingTarea) {
      const { error } = await supabase
        .from('tareas_frecuentes')
        .update({ nombre: formData.nombre, descripcion: formData.descripcion || null })
        .eq('id', editingTarea.id);
      if (error) {
        alert('Error al actualizar la tarea');
      }
    } else {
      const { error } = await supabase
        .from('tareas_frecuentes')
        .insert({ nombre: formData.nombre, descripcion: formData.descripcion || null });
      if (error) {
        alert('Error al crear la tarea');
      }
    }

    setSaving(false);
    handleCloseModal();
    fetchTareas();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta tarea?')) return;

    const { error } = await supabase
      .from('tareas_frecuentes')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error al eliminar la tarea');
    } else {
      fetchTareas();
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 h-full">
      {/* Header */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-8 flex items-center justify-between shrink-0 sticky top-0 z-10 w-full">
        <h2 className="text-xl font-bold tracking-tight">Tareas Frecuentes</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleOpenModal()}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold text-sm transition-all shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Nueva Tarea
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="p-8 space-y-6 overflow-y-auto max-w-4xl mx-auto w-full">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <p className="text-sm text-slate-500">
              Define las tareas más comunes para que aparezcan como botones rápidos al crear nuevas órdenes de trabajo.
            </p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500">Cargando tareas...</div>
          ) : tareas.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No hay tareas frecuentes definidas. Pulsa "Nueva Tarea" para añadir la primera.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {tareas.map(tarea => (
                <div key={tarea.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 dark:text-slate-200">{tarea.nombre}</p>
                    {tarea.descripcion && (
                      <p className="text-sm text-slate-500 mt-1">{tarea.descripcion}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenModal(tarea)}
                      className="p-2 text-slate-400 hover:text-sky-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(tarea.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {editingTarea ? 'Editar Tarea' : 'Nueva Tarea Frecuente'}
              </h3>
              <button onClick={handleCloseModal} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Nombre de la Tarea *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Instalación de aire acondicionado"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Descripción (opcional)
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Descripción breve de la tarea"
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 rounded-lg font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 rounded-lg font-bold text-sm bg-primary text-white hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}