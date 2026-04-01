import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  ordenData: any;
}

export default function EditarOrdenModal({ isOpen, onClose, onUpdated, ordenData }: Props) {
  const [formData, setFormData] = useState({
    referencia: '',
    cliente: '',
    aseguradora: '',
    tecnico: '',
    fecha: '',
    hora: '',
    observaciones: '',
    esUrgente: false,
    asegurado: '',
    telefono_asegurado: '',
    email: '',
    persona_contacto: '',
    telefono_contacto: '',
    direccion: '',
    otras_ordenes: '',
    estado: ''
  });

  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const [aseguradoras, setAseguradoras] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && ordenData) {
       fetchTecnicos();
       fetchAseguradoras();
       
       let fechaObj = new Date(ordenData.creado_en);
       let fecha = isNaN(fechaObj.getTime()) ? '' : fechaObj.toISOString().split('T')[0];
       let hora = isNaN(fechaObj.getTime()) ? '' : fechaObj.toTimeString().split(' ')[0].substring(0, 5);

       setFormData({
         referencia: ordenData.poliza || '',
         cliente: ordenData.cliente || '',
         aseguradora: ordenData.aseguradora || '',
         tecnico: ordenData.tecnico_id || '',
         fecha: fecha,
         hora: hora,
         observaciones: ordenData.descripcion || '',
         esUrgente: false, // You might have a specific flag in DB
         asegurado: ordenData.asegurado || '',
         telefono_asegurado: ordenData.telefono_asegurado || '',
         email: ordenData.email || '',
         persona_contacto: ordenData.persona_contacto || '',
         telefono_contacto: ordenData.telefono_contacto || '',
         direccion: ordenData.direccion || '',
         otras_ordenes: ordenData.otras_ordenes || '',
         estado: ordenData.estado || 'Pendiente'
       });
    }
  }, [isOpen, ordenData]);

  const fetchTecnicos = async () => {
    const { data } = await supabase.from('trabajadores').select('id, auth_user_id, nombre, apellidos').eq('estado', 'Disponible');
    if (data) setTecnicos(data);
  };

  const fetchAseguradoras = async () => {
    const { data } = await supabase.from('aseguradoras').select('id, nombre').eq('estado', 'Activa');
    if (data) setAseguradoras(data);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let createdAt = ordenData.creado_en;
    if (formData.fecha) {
        createdAt = new Date(`${formData.fecha}T${formData.hora || '12:00'}:00`).toISOString();
    }

    const { error } = await supabase
      .from('ordenes')
      .update({
         cliente: formData.cliente,
         aseguradora: formData.aseguradora,
         poliza: formData.referencia,
         asegurado: formData.asegurado,
         telefono_asegurado: formData.telefono_asegurado,
         email: formData.email,
         persona_contacto: formData.persona_contacto,
         telefono_contacto: formData.telefono_contacto,
         direccion: formData.direccion,
         otras_ordenes: formData.otras_ordenes,
         descripcion: formData.observaciones,
         estado: formData.estado,
         tecnico_id: formData.tecnico || null,
         creado_en: createdAt
      })
      .eq('id', ordenData.id);

    setLoading(false);
    if (!error) {
       if (onUpdated) onUpdated();
       onClose();
    } else {
       console.error("Error updating order", error);
       alert("Error al actualizar la orden.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg text-primary">
              <span className="material-symbols-outlined text-[24px]">edit_document</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Editar Orden</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Modifica los detalles de la intervención {ordenData.id_legible}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-full transition-colors border border-slate-200 dark:border-slate-700"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="editarReporteForm" onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Tipo de Cliente: DNI o CIF */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-slate-400">badge</span>
                  {formData.aseguradora ? 'CIF de la Empresa' : 'DNI / NIF'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={formData.aseguradora ? "Ej: B12345678" : "Ej: 12345678A"}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm"
                  value={formData.referencia}
                  onChange={(e) => setFormData({...formData, referencia: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-slate-400">link</span>
                  Otras Órdenes Vinculadas
                </label>
                <input
                  type="text"
                  placeholder="Ej: OB-2023-1254"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm"
                  value={formData.otras_ordenes}
                  onChange={(e) => setFormData({...formData, otras_ordenes: e.target.value})}
                />
              </div>

              {/* Cliente / Empresa */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-slate-400">business</span>
                  {formData.aseguradora ? 'Empresa' : 'Tipo de Cliente'}
                </label>
                <select
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm"
                  value={formData.aseguradora}
                  onChange={(e) => setFormData({...formData, aseguradora: e.target.value})}
                >
                  <option value="">Cliente Particular</option>
                  {aseguradoras.map(a => (
                     <option key={a.id} value={a.nombre}>{a.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-slate-400">info</span>
                  Estado
                </label>
                <select 
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm"
                  value={formData.estado}
                  onChange={(e) => setFormData({...formData, estado: e.target.value})}
                >
                  <option value="Pendiente">Pendiente</option>
                  <option value="Urgente">Urgente</option>
                  <option value="En Curso">En Curso</option>
                  <option value="En revisión">En revisión</option>
                  <option value="Pendiente de firma">Pendiente de firma</option>
                  <option value="Finalizada">Finalizada</option>
                  <option value="Cancelada">Cancelada</option>
                </select>
              </div>

              <div className="space-y-1.5 md:col-span-2 hidden md:block">
                <div className="h-px bg-slate-200 dark:bg-slate-800 w-full my-2"></div>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-slate-400">person</span>
                  {formData.aseguradora ? 'Nombre de la Empresa' : 'Nombre Completo'} *
                </label>
                <input
                  type="text"
                  required
                  placeholder={formData.aseguradora ? "Nombre de la empresa" : "Nombre y apellidos"}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm"
                  value={formData.cliente}
                  onChange={(e) => setFormData({...formData, cliente: e.target.value})}
                />
              </div>

              {/* Contacto en el domicilio / Persona responsable */}
              <div className="space-y-1.5 md:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase">
                          {formData.aseguradora ? 'Persona Responsable' : 'Contacto en Domicilio'}
                        </label>
                        <input type="text" value={formData.asegurado} onChange={e => setFormData({...formData, asegurado: e.target.value})} placeholder={formData.aseguradora ? "Nombre de la persona de contacto" : "Persona en el domicilio"} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase">Teléfono</label>
                        <input type="tel" value={formData.telefono_asegurado} onChange={e => setFormData({...formData, telefono_asegurado: e.target.value})} placeholder="Ej: 600123456" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                    </div>
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase">Dirección Completa de Intervención</label>
                        <input type="text" value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} placeholder="Ej: Calle Gran Vía 123, 1ºA, Madrid" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase">Email del Cliente / Asegurado</label>
                        <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="correo@ejemplo.com" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                    </div>
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-2 hidden md:block">
                <div className="h-px bg-slate-200 dark:bg-slate-800 w-full my-1"></div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-slate-400">calendar_month</span>
                  Fecha Programada
                </label>
                <input 
                  type="date" 
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm"
                  value={formData.fecha}
                  onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-slate-400">schedule</span>
                  Hora Programada (Aprox)
                </label>
                <input 
                  type="time" 
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm"
                  value={formData.hora}
                  onChange={(e) => setFormData({...formData, hora: e.target.value})}
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-slate-400">engineering</span>
                  Técnico Asignado
                </label>
                <select 
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm"
                  value={formData.tecnico}
                  onChange={(e) => setFormData({...formData, tecnico: e.target.value})}
                >
                  <option value="">-- Sin Asignar (Pendiente) --</option>
                  {tecnicos.map(t => (
                      <option key={t.id} value={t.auth_user_id || t.id}>{t.nombre} {t.apellidos}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-slate-400">edit_note</span>
                  Trabajo a Realizar / Observaciones
                </label>
                <textarea 
                  rows={3}
                  required
                  placeholder="Descripción del siniestro, tareas requeridas, etc."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm resize-none"
                  value={formData.observaciones}
                  onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                />
              </div>

            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            disabled={loading}
            form="editarReporteForm"
            className="px-6 py-2.5 bg-sky-500 text-white rounded-xl font-bold shadow-lg shadow-sky-500/30 hover:bg-sky-600 hover:shadow-sky-500/40 focus:ring-4 focus:ring-sky-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
                <span className="material-symbols-outlined text-[20px] animate-spin">refresh</span>
            ) : (
                <span className="material-symbols-outlined text-[20px]">save</span>
            )}
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}
