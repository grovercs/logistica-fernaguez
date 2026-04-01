import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
  fechaInicial?: string; // Fecha preseleccionada en formato YYYY-MM-DD
}

export default function NuevoReporteModal({ isOpen, onClose, onCreated, fechaInicial }: Props) {
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
  });

  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const [aseguradoras, setAseguradoras] = useState<any[]>([]);
  const [tareasFrecuentes, setTareasFrecuentes] = useState<any[]>([]);
  const [ordenesPrevias, setOrdenesPrevias] = useState<any[]>([]);
  const [direccionCliente, setDireccionCliente] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
       fetchTecnicos();
       fetchAseguradoras();
       fetchTareasFrecuentes();
       setFormData({
         referencia: '', cliente: '', aseguradora: '', tecnico: '',
         fecha: fechaInicial || new Date().toISOString().split('T')[0],
         hora: '10:00', observaciones: '', esUrgente: false,
         asegurado: '', telefono_asegurado: '', email: '',
         persona_contacto: '', telefono_contacto: '', direccion: '',
         otras_ordenes: '',
       });
    }
  }, [isOpen, fechaInicial]);

  const fetchTecnicos = async () => {
    const { data } = await supabase.from('trabajadores').select('id, auth_user_id, nombre, apellidos').eq('estado', 'Disponible');
    if (data) setTecnicos(data);
  };

  const fetchAseguradoras = async () => {
    // Seleccionar todas las columnas necesarias
    const { data, error } = await supabase
      .from('aseguradoras')
      .select('id, nombre, persona_contacto, telefono, email, direccion, estado, cif')
      .order('nombre');

    if (error) {
      console.error('Error fetching aseguradoras:', error);
    }
    if (data) setAseguradoras(data);
  };

  const fetchTareasFrecuentes = async () => {
    const { data } = await supabase.from('tareas_frecuentes').select('id, nombre, descripcion').order('nombre');
    if (data) setTareasFrecuentes(data);
  };

  const fetchOrdenesPrevias = async (clienteNombre: string) => {
    if (!clienteNombre) {
      setOrdenesPrevias([]);
      return;
    }
    const { data } = await supabase
      .from('ordenes')
      .select('id, id_legible, creado_en, estado, descripcion, cliente, aseguradora')
      .eq('cliente', clienteNombre)
      .order('creado_en', { ascending: false })
      .limit(5);
    if (data) setOrdenesPrevias(data);
  };

  const handleTareaFrecuente = (tareaNombre: string) => {
    if (tareaNombre) {
      const descripcionActual = formData.observaciones.trim();
      const nuevaDescripcion = descripcionActual
        ? `${descripcionActual}\n${tareaNombre}`
        : tareaNombre;
      setFormData({...formData, observaciones: nuevaDescripcion});
    }
  };

  const handleAseguradoraChange = (nombreAseguradora: string) => {
    const aseguradoraSeleccionada = aseguradoras.find(a => a.nombre === nombreAseguradora);

    if (aseguradoraSeleccionada) {
      setFormData({
        ...formData,
        aseguradora: nombreAseguradora,
        cliente: aseguradoraSeleccionada.nombre || '',
        // Mapear campos de la BD a los campos del formulario
        asegurado: aseguradoraSeleccionada.persona_contacto || '', // Persona responsable
        telefono_asegurado: aseguradoraSeleccionada.telefono || '', // Teléfono principal
        email: aseguradoraSeleccionada.email || '',
        referencia: aseguradoraSeleccionada.cif || '',
        // NO autocompletar dirección - el usuario puede elegir copiarla
      });
      // Guardar la dirección del cliente para mostrar opción de copiarla
      setDireccionCliente(aseguradoraSeleccionada.direccion || '');
      fetchOrdenesPrevias(aseguradoraSeleccionada.nombre);
    } else {
      // Cliente Particular - limpiar campos
      setFormData({
        ...formData,
        aseguradora: '',
        cliente: '',
        asegurado: '',
        telefono_asegurado: '',
        email: '',
        direccion: '',
        referencia: '',
      });
      setDireccionCliente('');
      setOrdenesPrevias([]);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getEstadoColor = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case 'finalizada': return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400';
      case 'en curso': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400';
      case 'pendiente': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400';
      case 'urgente': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400';
      default: return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const year = new Date().getFullYear();
    const id_legible = `OB-${year}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    let createdAt = new Date().toISOString();
    if (formData.fecha) {
        createdAt = new Date(`${formData.fecha}T${formData.hora || '12:00'}:00`).toISOString();
    }

    const { error } = await supabase
      .from('ordenes')
      .insert({
         id_legible,
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
         estado: formData.esUrgente ? 'Urgente' : (formData.tecnico ? 'En Curso' : 'Pendiente'),
         tecnico_id: formData.tecnico || null,
         creado_en: createdAt
      });

    setLoading(false);
    if (!error) {
       if (onCreated) onCreated();
       onClose();
    } else {
       console.error("Error creating order", error);
       alert("Error al crear la orden.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg text-primary">
              <span className="material-symbols-outlined text-[24px]">assignment_add</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Nuevo Reporte (Orden de Trabajo)</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Rellena los datos para programar la intervención</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-full transition-colors border border-slate-200 dark:border-slate-700"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form id="nuevoReporteForm" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Urgency Toggle */}
            <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-xl">
              <input 
                type="checkbox" 
                id="urgente"
                className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                checked={formData.esUrgente}
                onChange={(e) => setFormData({...formData, esUrgente: e.target.checked})}
              />
              <label htmlFor="urgente" className="flex-1 text-sm font-bold text-red-700 dark:text-red-400 cursor-pointer flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px]">warning</span>
                Marcar como URGENTE
              </label>
            </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Reference / DNI */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-slate-400">badge</span>
                  {formData.aseguradora ? 'CIF de la Empresa *' : 'DNI / NIF *'}
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

              {/* Otras Ordenes */}
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

              {/* Histórico de trabajos del cliente */}
              {ordenesPrevias.length > 0 && (
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-slate-400">history</span>
                    Trabajos Previos de {formData.aseguradora}
                  </label>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-3 max-h-40 overflow-y-auto">
                    {ordenesPrevias.map(orden => (
                      <div key={orden.id} className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700 last:border-0">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{orden.id_legible}</span>
                          <span className="text-xs text-slate-500">{formatDate(orden.creado_en)}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getEstadoColor(orden.estado)}`}>
                            {orden.estado}
                          </span>
                        </div>
                        <span className="text-xs text-slate-600 dark:text-slate-400 max-w-[200px] truncate">
                          {orden.descripcion?.substring(0, 50)}{orden.descripcion?.length > 50 ? '...' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">Mostrando las últimas {ordenesPrevias.length} órdenes de este cliente</p>
                </div>
              )}

              {/* Empresa / Cliente */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-slate-400">business</span>
                  Empresa / Cliente
                </label>
                <select
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm"
                  value={formData.aseguradora}
                  onChange={(e) => handleAseguradoraChange(e.target.value)}
                >
                  <option value="">Cliente Particular</option>
                  {aseguradoras.map(a => (
                     <option key={a.id} value={a.nombre}>
                       {a.nombre}{a.estado === 'Inactiva' ? ' (Inactiva)' : ''}
                     </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">Al seleccionar una empresa se autocompletarán los datos guardados</p>
              </div>

              {/* Nombre del Cliente (solo para Particulares) */}
              {!formData.aseguradora && (
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-slate-400">person</span>
                    Nombre del Cliente *
                  </label>
                  <input
                    type="text"
                    required={!formData.aseguradora}
                    placeholder="Nombre completo del cliente"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm"
                    value={formData.cliente}
                    onChange={(e) => setFormData({...formData, cliente: e.target.value})}
                  />
                </div>
              )}

              {/* Contacto en Domicilio / Persona Responsable */}
              <div className="space-y-1.5 md:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase">{formData.aseguradora ? 'Persona Responsable' : 'Contacto en Domicilio'}</label>
                        <input type="text" value={formData.asegurado} onChange={e => setFormData({...formData, asegurado: e.target.value})} placeholder={formData.aseguradora ? "Persona de contacto en la empresa" : "Persona en el domicilio"} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
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
                        <div className="flex gap-2">
                          <input type="text" value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} placeholder="Ej: Calle Gran Vía 123, 1ºA, Madrid" className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                          {formData.direccion && (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formData.direccion)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-2 text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-1 whitespace-nowrap"
                            >
                              <span className="material-symbols-outlined text-[16px]">map</span>
                              Maps
                            </a>
                          )}
                        </div>
                        {direccionCliente && !formData.direccion && (
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, direccion: direccionCliente})}
                            className="mt-1 text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[14px]">content_copy</span>
                            Usar dirección del cliente: {direccionCliente}
                          </button>
                        )}
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase">Email del Cliente</label>
                        <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="correo@ejemplo.com" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                    </div>
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase">Persona de Contacto Adicional</label>
                        <input type="text" value={formData.persona_contacto} onChange={e => setFormData({...formData, persona_contacto: e.target.value})} placeholder="Otra persona de contacto" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase">Teléfono de Contacto Adicional</label>
                        <input type="tel" value={formData.telefono_contacto} onChange={e => setFormData({...formData, telefono_contacto: e.target.value})} placeholder="Ej: 600123456" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                    </div>
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-2 hidden md:block">
                <div className="h-px bg-slate-200 dark:bg-slate-800 w-full my-1"></div>
              </div>

              {/* Fecha y Hora */}
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

              {/* Tecnico */}
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

              {/* Tareas Frecuentes + Observaciones */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-slate-400">edit_note</span>
                  Trabajo a Realizar / Observaciones
                </label>

                {/* Selector de tareas frecuentes */}
                {tareasFrecuentes.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="text-xs text-slate-500">Tareas frecuentes:</span>
                    {tareasFrecuentes.slice(0, 6).map(tarea => (
                      <button
                        key={tarea.id}
                        type="button"
                        onClick={() => handleTareaFrecuente(tarea.nombre)}
                        className="px-2 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full hover:bg-primary hover:text-white transition-colors"
                      >
                        + {tarea.nombre}
                      </button>
                    ))}
                    {tareasFrecuentes.length > 6 && (
                      <span className="text-xs text-slate-400">+{tareasFrecuentes.length - 6} más</span>
                    )}
                  </div>
                )}

                <textarea
                  rows={3}
                  required
                  placeholder="Descripción del trabajo, tareas requeridas, etc."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm resize-none"
                  value={formData.observaciones}
                  onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                />
              </div>

            </div>
          </form>
        </div>

        {/* Footer Actions */}
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
            form="nuevoReporteForm"
            className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/30 hover:bg-primary/90 hover:shadow-primary/40 focus:ring-4 focus:ring-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
                <span className="material-symbols-outlined text-[20px] animate-spin">refresh</span>
            ) : (
                <span className="material-symbols-outlined text-[20px]">save</span>
            )}
            Guardar Reporte
          </button>
        </div>
      </div>
    </div>
  );
}
