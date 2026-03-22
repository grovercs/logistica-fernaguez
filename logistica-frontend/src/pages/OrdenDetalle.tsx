import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import EditarOrdenModal from '../components/modals/EditarOrdenModal';

export default function OrdenDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [orden, setOrden] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [reportes, setReportes] = useState<any[]>([]);
  const [trabajadores, setTrabajadores] = useState<any[]>([]);

  // Computed values from reports
  const totalHoras = reportes.reduce((sum, r) => sum + (Number(r.horas_trabajadas) || 0), 0);
  const formatHoras = (h: number) => {
    const hrs = Math.floor(h);
    const mins = Math.round((h % 1) * 60);
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  };

  useEffect(() => {
    if (id) fetchOrden(id);
  }, [id]);

  const fetchOrden = async (orderId: string) => {
    const [ordenReq, reportesReq, trabReq] = await Promise.all([
      supabase.from('ordenes').select('*').eq('id', orderId).single(),
      supabase.from('reportes').select('*').eq('orden_id', orderId),
      supabase.from('trabajadores').select('auth_user_id, nombre, apellidos')
    ]);
      
    if (!ordenReq.error && ordenReq.data) {
      setOrden(ordenReq.data);
    }
    if (!reportesReq.error && reportesReq.data) {
      setReportes(reportesReq.data);
    }
    if (!trabReq.error && trabReq.data) {
      setTrabajadores(trabReq.data);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (window.confirm('¿Estás seguro de que deseas borrar esta orden y todos sus reportes asociados? Esta acción no se puede deshacer.')) {
      setLoading(true);
      const { error } = await supabase.from('ordenes').delete().eq('id', id);
      if (!error) {
         navigate('/ordenes');
      } else {
         console.error('Error deleting:', error);
         alert('Hubo un error al borrar la orden.');
         setLoading(false);
      }
    }
  };

  const firmReporte = reportes.find(r => r.firma_url);

  if (loading) return <div className="p-8 text-center text-slate-500 font-bold">Cargando reporte de orden...</div>;
  if (!orden) return <div className="p-8 text-center text-slate-500">No se encontró la orden.</div>;

  return (
    <div className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 w-full h-full">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 w-full">
        <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/ordenes')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
              <span className="material-symbols-outlined font-bold">arrow_back</span>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-primary material-symbols-outlined">assignment</span>
                <h2 className="text-xl font-bold">Detalle de Intervención</h2>
              </div>
              <p className="text-slate-500 text-sm font-medium">Reporte: <span className="text-primary">{orden.id_legible}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
              Editar
            </button>
            <button className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
              <span className="material-symbols-outlined text-[18px]">print</span>
              Imprimir
            </button>
            <button className="flex items-center gap-2 bg-primary text-white hover:bg-primary/90 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
              <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
              Exportar PDF
            </button>
          </div>
        </div>
      </header>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto">
          {/* Left Column: Report Details (Information Section) */}
          <div className="lg:col-span-4 space-y-6">
            
            <section className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">assignment</span>
                  <h3 className="font-bold text-sm">Reporte</h3>
                </div>
              </div>
              
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {/* Referencia */}
                <div className="p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-[16px]">book</span>
                    <label className="text-xs font-bold uppercase tracking-wider">Cliente</label>
                  </div>
                  <p className="text-sm font-medium pl-6">{orden.cliente}</p>
                </div>
                
                {/* Parte de Avería / Poliza */}
                <div className="p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-[16px]">location_on</span>
                    <label className="text-xs font-bold uppercase tracking-wider">Aseguradora / Póliza</label>
                  </div>
                  <div className="pl-6">
                    <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 uppercase">{orden.aseguradora} - {orden.poliza || 'N/A'}</span>
                  </div>
                </div>

                {/* Trabajo */}
                <div className="p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    <label className="text-xs font-bold uppercase tracking-wider">Trabajo</label>
                  </div>
                  <div className="pl-6">
                    <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 uppercase">yes</span>
                  </div>
                </div>

                {/* Otras Órdenes */}
                <div className="p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-[16px]">description</span>
                    <label className="text-xs font-bold uppercase tracking-wider">Otras Órdenes (Vinculadas)</label>
                  </div>
                  <p className="text-sm font-medium pl-6 text-slate-700 dark:text-slate-300">{orden.otras_ordenes || '-'}</p>
                </div>

                {/* Asegurado */}
                <div className="p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-[16px]">person</span>
                    <label className="text-xs font-bold uppercase tracking-wider">Asegurado</label>
                  </div>
                  <p className="text-sm font-medium pl-6 text-slate-700 dark:text-slate-300">{orden.asegurado || '-'}</p>
                </div>

                {/* Teléfono Asegurado */}
                <div className="p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-[16px]">call</span>
                    <label className="text-xs font-bold uppercase tracking-wider">Teléfono Asegurado</label>
                  </div>
                  <p className="text-sm font-medium pl-6 text-slate-700 dark:text-slate-300">{orden.telefono_asegurado || '-'}</p>
                </div>

                {/* Email */}
                <div className="p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-[16px]">mail</span>
                    <label className="text-xs font-bold uppercase tracking-wider">Email</label>
                  </div>
                  <p className="text-sm font-medium pl-6 text-slate-700 dark:text-slate-300">{orden.email || '-'}</p>
                </div>

                {/* Persona de Contacto */}
                <div className="p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-[16px]">contact_page</span>
                    <label className="text-xs font-bold uppercase tracking-wider">Persona de Contacto</label>
                  </div>
                  <p className="text-sm font-medium pl-6 text-slate-700 dark:text-slate-300">{orden.persona_contacto || '-'}</p>
                </div>

                {/* Teléfono Persona Contacto */}
                <div className="p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-[16px]">phone_iphone</span>
                    <label className="text-xs font-bold uppercase tracking-wider">Teléfono Persona Contacto</label>
                  </div>
                  <p className="text-sm font-medium pl-6 text-slate-700 dark:text-slate-300">{orden.telefono_contacto || '-'}</p>
                </div>

                {/* Dirección */}
                <div className="p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-[16px]">home</span>
                    <label className="text-xs font-bold uppercase tracking-wider">Dirección</label>
                  </div>
                  <p className="text-sm font-medium pl-6 text-slate-700 dark:text-slate-300">{orden.direccion || '-'}</p>
                </div>

                {/* Observaciones */}
                <div className="p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-[16px]">edit_note</span>
                    <label className="text-xs font-bold uppercase tracking-wider">Trabajo / Descripción</label>
                  </div>
                  <p className="text-sm font-medium pl-6 text-slate-700 dark:text-slate-300">{orden.descripcion || 'Sin descripción'}</p>
                </div>

                {/* Estado */}
                <div className="p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-[16px]">info</span>
                    <label className="text-xs font-bold uppercase tracking-wider">Estado</label>
                  </div>
                  <p className="text-sm font-bold pl-6 text-primary">{orden.estado}</p>
                </div>

                {/* Acción */}
                <div className="p-4 flex flex-col gap-1 bg-slate-50 dark:bg-slate-800/20">
                  <div className="flex items-center gap-2 text-slate-500 mb-2">
                    <span className="material-symbols-outlined text-[16px]">touch_app</span>
                    <label className="text-xs font-bold uppercase tracking-wider">Acción</label>
                  </div>
                  <div className="pl-6 flex gap-2">
                    <button onClick={() => setIsEditModalOpen(true)} className="px-3 py-1 bg-sky-500 hover:bg-sky-600 text-white rounded text-xs font-bold transition-colors shadow-sm">Editar</button>
                    <button onClick={handleDelete} className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-bold transition-colors shadow-sm">Borrar</button>
                  </div>
                </div>

              </div>
            </section>
          </div>

          {/* Right Column: Timeline and Details */}
          <div className="lg:col-span-8 space-y-6">
            
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col">
              
              {/* Timeline Items */}
              <div className="p-6">
                <div className="relative space-y-8 before:absolute before:inset-0 before:ml-[34px] before:-translate-x-px before:h-full before:w-[2px] before:bg-slate-200 dark:before:bg-slate-800">
                  
                  {/* Date Badge: creation date */}
                  <div className="relative flex items-center gap-3 mb-8">
                     <span className="bg-orange-500 text-white px-3 py-1 rounded text-sm font-bold shadow-sm z-10 relative">
                       Creada: {new Date(orden.creado_en).toLocaleDateString('es-ES')}
                     </span>
                     {reportes.length > 0 && (
                       <span className="text-xs text-slate-500 font-medium">
                         Intervenciones en:
                         {[...new Set(reportes.map(r => r.fecha_trabajo).filter(Boolean))].sort().map(fecha => (
                           <span key={fecha} className="ml-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded font-bold">
                             {new Date((fecha as string) + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                           </span>
                         ))}
                       </span>
                     )}
                  </div>

                  {/* Intervention Item */}
                  <div className="relative flex items-start group">
                    <div className="absolute left-4 flex items-center justify-center w-9 h-9 rounded-full bg-primary text-white border-[3px] border-white dark:border-slate-900 z-10">
                      <span className="material-symbols-outlined text-[18px]">mail</span>
                    </div>

                    <div className="ml-16 flex-1 border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20 rounded-lg overflow-hidden">
                      {/* Header */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          <span className="text-primary font-bold mr-1">Trabajos Realizados</span> 
                        </p>
                        <time className="text-xs font-bold text-slate-500 flex items-center gap-1 mt-2 md:mt-0">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          {totalHoras > 0 ? `${formatHoras(totalHoras)} totales` : 'Sin horas registradas'}
                        </time>
                      </div>
                      
                      {/* Worker List */}
                      <div className="p-4">
                        <p className="text-sm text-slate-700 dark:text-slate-300 font-bold mb-3">Registros de los Técnicos:</p>
                        
                        {reportes.length > 0 ? (
                            <div className="space-y-4">
                                {reportes.map((rep, idx) => {
                                    const worker = trabajadores.find(t => t.auth_user_id === rep.tecnico_id);
                                    const workerName = worker ? `${worker.nombre} ${worker.apellidos}` : 'Técnico';
                                    return (
                                        <div key={rep.id} className={`pb-4 ${idx !== reportes.length - 1 ? 'border-b border-slate-100 dark:border-slate-700' : ''}`}>
                                            <div className="flex justify-between items-start mb-1.5">
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[16px] text-primary">engineering</span>
                                                        {workerName}
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-0.5">Tiempo invertido: <span className="font-bold text-slate-700 dark:text-slate-300">{rep.horas_trabajadas} hrs</span></p>
                                                </div>
                                                 <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded font-bold">
                                                     {rep.fecha_trabajo 
                                                       ? new Date(rep.fecha_trabajo + 'T12:00:00').toLocaleDateString('es-ES')
                                                       : new Date(rep.creado_en).toLocaleDateString('es-ES')
                                                     }
                                                 </span>
                                            </div>
                                            <p className="text-sm text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm mt-2 whitespace-pre-wrap leading-relaxed">
                                                {rep.notas || <span className="italic text-slate-400">Sin materiales o acciones descritas.</span>}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-6 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                                <span className="material-symbols-outlined text-slate-300 text-[32px] mb-2">pending_actions</span>
                                <p className="text-sm text-slate-500 font-medium">Esperando partes de trabajo de los técnicos...</p>
                            </div>
                        )}

                        {/* Photos gallery from all reports */}
                        {(() => {
                            const allFotos = reportes.flatMap(rep => {
                                const worker = trabajadores.find(t => t.auth_user_id === rep.tecnico_id);
                                const name = worker ? `${worker.nombre} ${worker.apellidos}` : 'Técnico';
                                return (rep.fotos_urls || []).map((url: string) => ({ url, name }));
                            });
                            if (allFotos.length === 0) return null;
                            return (
                                <div className="mt-6">
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[16px] text-orange-500">photo_library</span>
                                        Fotos de la intervención ({allFotos.length})
                                    </p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {allFotos.map((f, i) => (
                                            <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="group block">
                                                <img
                                                    src={f.url}
                                                    alt={`Foto ${i + 1} de ${f.name}`}
                                                    className="w-full h-32 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm group-hover:shadow-md group-hover:scale-[1.02] transition-all"
                                                />
                                                <p className="text-[10px] text-slate-400 mt-1 truncate">{f.name}</p>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Invoices/receipts gallery */}
                        {(() => {
                            const allFacturas = reportes.flatMap(rep => {
                                const worker = trabajadores.find(t => t.auth_user_id === rep.tecnico_id);
                                const name = worker ? `${worker.nombre} ${worker.apellidos}` : 'Técnico';
                                return (rep.facturas_urls || []).map((url: string) => ({ url, name }));
                            });
                            if (allFacturas.length === 0) return null;
                            return (
                                <div className="mt-4">
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[16px] text-amber-500">receipt_long</span>
                                        Facturas / Albaranes ({allFacturas.length})
                                    </p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {allFacturas.map((f, i) => (
                                            <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="group block">
                                                <img
                                                    src={f.url}
                                                    alt={`Factura ${i + 1} de ${f.name}`}
                                                    className="w-full h-32 object-cover rounded-lg border-2 border-amber-200 dark:border-amber-800 shadow-sm group-hover:shadow-md group-hover:scale-[1.02] transition-all"
                                                />
                                                <p className="text-[10px] text-slate-400 mt-1 truncate">{f.name}</p>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}
                      </div>


                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* Conformidad del Cliente */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden mt-6">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">draw</span>
                <h3 className="font-bold text-sm">Conformidad del Cliente</h3>
              </div>
              <div className="p-6">
                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                  
                  {/* Vista previa de la firma */}
                  <div className="w-full md:w-1/2">
                    <p className="text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-2">Firma Digital</p>
                    <div className="bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg h-32 flex items-center justify-center overflow-hidden">
                      {firmReporte?.firma_url ? (
                         <img src={firmReporte.firma_url} alt="Firma del cliente" className="h-full object-contain mix-blend-multiply dark:mix-blend-normal dark:invert" />
                      ) : (
                         <span className="text-3xl font-serif italic text-slate-400 dark:text-slate-600 select-none">Firma aquí...</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Datos de la firma */}
                  <div className="w-full md:w-1/2 space-y-4">
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Firmado por</label>
                      <p className="text-sm font-medium">{firmReporte ? orden.cliente : 'Pendiente de firma'}</p>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Fecha y Hora de Firma</label>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="material-symbols-outlined text-slate-400 text-[18px]">event_available</span>
                        <p className="text-sm text-slate-500 font-medium">
                           {firmReporte ? new Date(firmReporte.creado_en || orden.creado_en).toLocaleString('es-ES') : '---'}
                        </p>
                      </div>
                    </div>
                    <div className="pt-2">
                      <p className="text-[10px] text-slate-500 leading-tight italic">
                        Al firmar, el cliente confirma que los trabajos descritos han sido realizados a su entera satisfacción.
                      </p>
                    </div>
                    {reportes.length === 0 && (
                       <button className="mt-4 px-4 py-2 bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 rounded-lg text-sm font-bold w-full flex items-center justify-center gap-2 cursor-not-allowed">
                         <span className="material-symbols-outlined text-[18px]">edit_document</span>
                         Esperando al técnico
                       </button>
                    )}
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
      
      {orden && (
          <EditarOrdenModal
             isOpen={isEditModalOpen}
             onClose={() => setIsEditModalOpen(false)}
             onUpdated={() => fetchOrden(id!)}
             ordenData={orden}
          />
      )}
    </div>
  );
}
