import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import EditarOrdenModal from '../components/modals/EditarOrdenModal';
import EditarReporteModal from '../components/modals/EditarReporteModal';
import AsignacionesSection from '../components/AsignacionesSection';
import { PrintableOrden } from '../components/PrintableOrden';
import { useRef } from 'react';
// @ts-ignore
import html2pdf from 'html2pdf.js';

export default function OrdenDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [orden, setOrden] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditReporteModalOpen, setIsEditReporteModalOpen] = useState(false);
  const [selectedReporte, setSelectedReporte] = useState<any>(null);

  const [reportes, setReportes] = useState<any[]>([]);
  const [trabajadores, setTrabajadores] = useState<any[]>([]);
  const printRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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
  const handleFinalizarOrden = async () => {
    if (!window.confirm('¿Estás seguro de que deseas finalizar esta orden? Esto marcará el trabajo como completado oficialmente.')) return;
    
    const { error } = await supabase
      .from('ordenes')
      .update({ 
        estado: 'Finalizada',
        fecha_cierre: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Error finalizando orden:', error);
      alert('Error al finalizar la orden.');
    } else {
      setOrden((prev: any) => prev ? { ...prev, estado: 'Finalizada', fecha_cierre: new Date().toISOString() } : null);
    }
  };

  const handleDeleteReporte = async (reporteId: string) => {
    if (!window.confirm('¿Estás seguro de que deseas borrar este registro de trabajo? Esta acción no se puede deshacer.')) return;
    
    setLoading(true);
    const { error } = await supabase.from('reportes').delete().eq('id', reporteId);
    
    if (error) {
      console.error('Error deleting report:', error);
      alert('Error al borrar el reporte.');
      setLoading(false);
    } else {
      // Refresh order data
      fetchOrden(id!);
    }
  };

  const firmReporte = [...reportes]
    .filter(r => r.firma_url && r.firma_url.length > 5)
    .sort((a, b) => new Date(b.creado_en || 0).getTime() - new Date(a.creado_en || 0).getTime())[0];

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    if (!printRef.current || !orden) return;
    setIsGeneratingPdf(true);
    
    try {
      const element = printRef.current;
      const opt = {
        margin: 0,
        filename: `Reporte_${orden.id_legible}_${Date.now()}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          logging: false,
          letterRendering: true
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      // Ensure images are loaded potentially? html2pdf usually handles it if useCORS is true
      await html2pdf().from(element).set(opt).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar el PDF. Reintente en unos instantes.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

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
              <div className="flex items-center gap-3">
                <p className="text-slate-500 text-sm font-medium">Reporte: <span className="text-primary font-bold">{orden.id_legible}</span></p>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  orden.estado === 'Urgente' ? 'bg-red-100 text-red-700 dark:bg-red-900/30' :
                  orden.estado === 'En revisión' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30' :
                  orden.estado === 'Pendiente de firma' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30' :
                  orden.estado === 'Pendiente' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20' :
                  orden.estado === 'En Curso' ? 'bg-primary/10 text-primary' :
                  orden.estado === 'Finalizada' ? 'bg-green-100 text-green-700 dark:bg-green-900/20' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {orden.estado}
                </span>
              </div>
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
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">print</span>
              Imprimir
            </button>
            <button 
              onClick={handleExportPDF}
              disabled={isGeneratingPdf}
              className="flex items-center gap-2 bg-primary text-white hover:bg-primary/90 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
              {isGeneratingPdf ? 'Generando...' : 'Exportar PDF'}
            </button>
            {orden.estado !== 'Finalizada' && (
              <button 
                onClick={handleFinalizarOrden}
                className="flex items-center gap-2 bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-green-600/20"
              >
                <span className="material-symbols-outlined text-[18px]">task_alt</span>
                Finalizar Orden
              </button>
            )}
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
                {/* Cliente */}
                <div className="p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-[16px]">person</span>
                    <label className="text-xs font-bold uppercase tracking-wider">
                      {orden.aseguradora ? 'Nombre Empresa' : 'Cliente'}
                    </label>
                  </div>
                  <p className="text-sm font-medium pl-6">{orden.cliente}</p>
                </div>

                {/* DNI / CIF */}
                <div className="p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-[16px]">badge</span>
                    <label className="text-xs font-bold uppercase tracking-wider">
                      {orden.aseguradora ? 'CIF' : 'DNI / NIF'}
                    </label>
                  </div>
                  <p className="text-sm font-medium pl-6">{orden.poliza || '-'}</p>
                </div>

                {/* Empresa (solo si hay) */}
                {orden.aseguradora && (
                  <div className="p-4 flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-slate-500">
                      <span className="material-symbols-outlined text-[16px]">business</span>
                      <label className="text-xs font-bold uppercase tracking-wider">Empresa</label>
                    </div>
                    <p className="text-sm font-medium pl-6">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 uppercase">
                        {orden.aseguradora}
                      </span>
                    </p>
                  </div>
                )}

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

                {/* Contacto */}
                <div className="p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-[16px]">person</span>
                    <label className="text-xs font-bold uppercase tracking-wider">
                      {orden.aseguradora ? 'Persona Responsable' : 'Contacto en Domicilio'}
                    </label>
                  </div>
                  <p className="text-sm font-medium pl-6 text-slate-700 dark:text-slate-300">{orden.asegurado || '-'}</p>
                </div>

                {/* Teléfono Contacto */}
                <div className="p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-[16px]">call</span>
                    <label className="text-xs font-bold uppercase tracking-wider">Teléfono Contacto</label>
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

            {/* Asignaciones de Trabajo */}
            <AsignacionesSection ordenId={id!} onUpdate={() => fetchOrden(id!)} />
          </div>

          {/* Right Column: Timeline and Details */}
          <div className="lg:col-span-8 space-y-6">
            
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col">
              
              {/* Timeline Items */}
              <div className="p-6">
                <div className="relative space-y-8 before:absolute before:inset-0 before:ml-[34px] before:-translate-x-px before:h-full before:w-[2px] before:bg-slate-200 dark:before:bg-slate-800">
                  
                  {/* Date Badge: creation date */}
                  <div className="relative flex items-center gap-3 mb-8">
                     <span className="bg-orange-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-md z-10 relative flex items-center gap-2">
                       <span className="material-symbols-outlined text-[18px]">event</span>
                       Creada: {new Date(orden.creado_en).toLocaleDateString('es-ES')}
                       <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[10px] uppercase">
                         {(() => {
                           const diff = new Date().getTime() - new Date(orden.creado_en).getTime();
                           const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                           if (days === 0) return 'Hoy';
                           if (days === 1) return 'Ayer';
                           return `Hace ${days} días`;
                         })()}
                       </span>
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
                                                        <button 
                                                            onClick={() => {
                                                                setSelectedReporte(rep);
                                                                setIsEditReporteModalOpen(true);
                                                            }}
                                                            className="ml-2 text-slate-400 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                                                            title="Editar registro"
                                                        >
                                                            <span className="material-symbols-outlined text-[14px]">edit</span>
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteReporte(rep.id)}
                                                            className="ml-1 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                                                            title="Borrar registro"
                                                        >
                                                            <span className="material-symbols-outlined text-[14px]">delete</span>
                                                        </button>
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
                                            <div className="text-sm text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm mt-2 whitespace-pre-wrap leading-relaxed">
                                                {(() => {
                                                    const splitted = (rep.notas || '').split(/\n{1,2}MATERIALES:?\n?| MATERIALES: /i);
                                                    const work = splitted[0]?.trim();
                                                    const mats = splitted[1]?.trim();
                                                    return (
                                                        <>
                                                            <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Descripción del trabajo:</p>
                                                            <p className="mb-2">{work || <span className="italic text-slate-400">Sin descripción del trabajo.</span>}</p>
                                                            {mats && (
                                                                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                                                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Materiales:</p>
                                                                    <p className="text-xs opacity-80">{mats}</p>
                                                                </div>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>

                                            {/* Fotos de esta intervención */}
                                            {(rep.fotos_urls && rep.fotos_urls.length > 0) && (
                                                <div className="mt-3">
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[14px] text-orange-500">photo_library</span>
                                                        Fotos ({rep.fotos_urls.length})
                                                    </p>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {(rep.fotos_urls as string[]).map((url, i) => (
                                                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="group block">
                                                                <img
                                                                    src={url}
                                                                    alt={`Foto ${i + 1}`}
                                                                    className="w-full h-20 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm group-hover:shadow-md group-hover:scale-[1.02] transition-all"
                                                                />
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Facturas de esta intervención */}
                                            {(rep.facturas_urls && rep.facturas_urls.length > 0) && (
                                                <div className="mt-3">
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[14px] text-amber-500">receipt_long</span>
                                                        Facturas ({rep.facturas_urls.length})
                                                    </p>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {(rep.facturas_urls as string[]).map((url, i) => (
                                                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="group block">
                                                                <img
                                                                    src={url}
                                                                    alt={`Factura ${i + 1}`}
                                                                    className="w-full h-20 object-cover rounded-lg border-2 border-amber-200 dark:border-amber-800 shadow-sm group-hover:shadow-md group-hover:scale-[1.02] transition-all"
                                                                />
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
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
                         <div className="flex flex-col items-center gap-1 opacity-40">
                            <span className="material-symbols-outlined text-[40px]">history_edu</span>
                            <span className="text-xs font-bold uppercase tracking-wider">Pendiente de firma</span>
                         </div>
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

      {isEditReporteModalOpen && (
        <EditarReporteModal
           isOpen={isEditReporteModalOpen}
           onClose={() => setIsEditReporteModalOpen(false)}
           onUpdated={() => fetchOrden(id!)}
           reporteData={selectedReporte}
        />
      )}

      {/* Hidden Printable Area */}
      <div className="hidden">
        <div className="block">
           <PrintableOrden 
             ref={printRef}
             orden={orden}
             reportes={reportes}
             trabajadores={trabajadores}
           />
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .hidden-print, header, aside, nav, button {
            display: none !important;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            margin: 0;
            padding: 0;
          }
          /* This is a cheat: we wrap our printable component in an ID for the media print selector */
        }
      `}</style>

      {/* Re-rendering the printable component specifically for window.print() if needed 
          Actually, I'll wrap the PrintableOrden in a div that is visible only on print
      */}
      <div id="print-area" className="hidden print:block fixed inset-0 z-[9999] bg-white">
          <PrintableOrden 
             orden={orden}
             reportes={reportes}
             trabajadores={trabajadores}
           />
      </div>

    </div>
  );
}
