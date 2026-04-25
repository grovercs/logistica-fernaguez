import React from 'react';

interface Props {
  orden: any;
  reportes: any[];
  trabajadores: any[];
}

export const PrintableOrden = React.forwardRef<HTMLDivElement, Props>(({ orden, reportes, trabajadores }, ref) => {
  if (!orden) return null;

  const totalHoras = reportes.reduce((sum, r) => sum + (Number(r.horas_trabajadas) || 0), 0);
  const firmReporte = [...reportes]
    .filter(r => r.firma_url && r.firma_url.length > 5)
    .sort((a, b) => new Date(b.creado_en || 0).getTime() - new Date(a.creado_en || 0).getTime())[0];

  return (
    <div ref={ref} className="bg-white text-slate-900 w-[210mm] font-sans mx-auto relative printable-container shadow-none" style={{ minHeight: '297mm' }}>
      {/* Styles for Printing and Layout */}
      <style>{`
        @page {
          size: A4;
          margin: 0;
        }
        @media print {
          body {
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
          }
          .printable-container {
             width: 210mm !important;
             margin: 0 auto !important;
             position: relative;
          }
        }
        .printable-container {
           width: 210mm;
           padding: 10mm 15mm 25mm 15mm;
           box-sizing: border-box;
        }
        .page-footer-container {
          position: fixed;
          bottom: 10mm;
          left: 15mm;
          right: 15mm;
          height: 15mm;
          border-top: 1px solid #e2e8f0;
          text-align: center;
          font-size: 8px;
          color: #94a3b8;
          background: white;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .page-break {
          page-break-before: always;
          padding-top: 20mm;
        }
        .avoid-break {
          page-break-inside: avoid;
        }
      `}</style>

      {/* FIXED FOOTER */}
      <div className="page-footer-container">
        <p className="font-bold text-slate-600 uppercase mb-1">Logística Fernaguez - Servicios de Logística, Reformas y Mantenimiento</p>
        <p>Reporte Nº {orden.id_legible} | Fecha de Impresión: {new Date().toLocaleDateString('es-ES')} | app.appvielha.com</p>
        <p className="mt-1 text-[7px] opacity-50">Documento de carácter técnico. Los datos contenidos están sujetos a la normativa vigente de protección de datos (RGPD).</p>
      </div>

      <div className="w-full">
        {/* Header Section */}
        <div className="flex justify-between items-start border-b-2 border-blue-600 pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-blue-600 tracking-tight italic">FERNAGUEZ</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">LOGÍSTICA • REFORMAS • SERVICIOS</p>
            <div className="mt-4 text-[9px] text-slate-400 leading-tight">
              <p>Soporte Técnico: soporte@fernaguez.com</p>
              <p>Gestión de Intervenciones 24/7</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Reporte de Servicio</h2>
            <p className="text-sm font-bold text-blue-600">Nº ORDEN: {orden.id_legible}</p>
            <p className="text-[10px] text-slate-500 mt-2 font-medium uppercase">EMITIDO: {new Date().toLocaleDateString('es-ES')}</p>
          </div>
        </div>

        {/* Client & Info Section */}
        <div className="grid grid-cols-2 gap-x-12 mb-8">
          <div className="space-y-4">
            <div className="border-l-4 border-blue-600 pl-3">
               <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Titular del Servicio</h3>
               <p className="text-sm font-bold mt-0.5">{orden.cliente}</p>
               <p className="text-[10px] text-slate-600 mt-1">{orden.aseguradora ? 'Empresa' : 'Cliente Particular'} | Ref: {orden.poliza || 'S/N'}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="border-l-4 border-slate-300 pl-3">
               <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Ubicación</h3>
               <p className="text-xs font-medium text-slate-700 leading-tight mt-1">{orden.direccion || 'No especificada'}</p>
            </div>
            <div className="border-l-4 border-slate-300 pl-3">
               <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Contacto</h3>
               <p className="text-xs font-medium text-slate-700 mt-1">{orden.asegurado || '---'} {orden.telefono_asegurado ? `(${orden.telefono_asegurado})` : ''}</p>
            </div>
          </div>
        </div>

        {/* Encargo / Descripción */}
        <div className="bg-slate-50 p-3 rounded border border-slate-200 mb-8">
            <h3 className="text-[9px] font-bold text-blue-600 uppercase tracking-wider mb-1">Descripción del Encargo</h3>
            <p className="text-xs leading-relaxed text-slate-700 italic">"{orden.descripcion || 'Sin descripción detallada.'}"</p>
        </div>

        {/* Interventions Detail */}
        <div className="mb-8">
          <h3 className="text-[11px] font-black text-slate-900 border-b border-slate-200 pb-1 mb-4 uppercase">Detalle de Trabajos Realizados</h3>
          <div className="space-y-4">
            {reportes.length > 0 ? reportes.map((rep, i) => {
               const worker = trabajadores.find(t => t.auth_user_id === rep.tecnico_id);
               return (
                 <div key={i} className="pb-4 border-b border-slate-100 last:border-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <div>
                        <p className="text-[10px] font-bold text-slate-800 uppercase">
                          {worker ? `${worker.nombre} ${worker.apellidos}` : 'Servicio Técnico'}
                          {worker?.especialidad && <span className="ml-2 text-blue-600 font-medium">({worker.especialidad})</span>}
                        </p>
                      </div>
                      <p className="text-[9px] font-bold text-slate-400">{rep.fecha_trabajo || new Date(rep.creado_en).toLocaleDateString('es-ES')} | {rep.horas_trabajadas} hrs</p>
                    </div>
                    <div className="text-[10px] text-slate-600 leading-normal whitespace-pre-wrap">
                      {rep.notas}
                    </div>
                 </div>
               )
            }) : (
               <p className="text-[10px] italic text-slate-300 py-4 text-center border border-dashed rounded uppercase">No hay reportes de trabajo registrados todavía.</p>
            )}
          </div>
        </div>

        {/* SUMMARY & SIGNATURE */}
        <div className="avoid-break mt-10">
          <div className="bg-blue-600 text-white p-4 rounded-lg flex justify-end gap-12 mb-10 shadow-sm">
              <div className="text-right">
                 <p className="text-[9px] font-bold opacity-80 uppercase">Total Horas</p>
                 <p className="text-2xl font-black">{totalHoras} H</p>
              </div>
              <div className="text-right">
                 <p className="text-[9px] font-bold opacity-80 uppercase">Estado Final</p>
                 <p className="text-2xl font-black uppercase">{orden.estado === 'Finalizada' ? 'CERTIFICADA' : 'EN CURSO'}</p>
              </div>
          </div>

          <div className="pt-8 border-t-2 border-slate-100">
            <div className="grid grid-cols-2 gap-20">
              <div className="text-center">
                 <div className="h-24 border-b border-slate-200 flex items-end justify-center pb-2">
                    <p className="text-[9px] text-slate-400 italic">Validado por Operativo</p>
                 </div>
                 <p className="text-[10px] font-bold text-slate-700 mt-2 uppercase tracking-widest">Firma Técnico</p>
              </div>
              <div className="text-center">
                 <div className="h-24 border-b border-slate-200 flex items-center justify-center">
                    {firmReporte?.firma_url ? (
                       <img src={firmReporte.firma_url} alt="Firma cliente" className="max-h-20 mix-blend-multiply" />
                    ) : (
                       <p className="text-[9px] text-slate-300 italic">Pendiente de firma del cliente</p>
                    )}
                 </div>
                 <p className="text-[10px] font-bold text-slate-700 mt-2 uppercase tracking-widest">Conformidad Cliente</p>
                 <p className="text-[8px] text-slate-400 mt-1 uppercase font-medium">{orden.cliente}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ANEXO FOTOGRÁFICO - ORGANIZED BY TECHNICIAN */}
        <div className="page-break">
          <div className="border-b-2 border-slate-900 pb-4 mb-8">
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Anexo de Evidencias</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Reporte Documental por Intervención</p>
          </div>

          <div className="space-y-12">
            {reportes.map((rep, rIdx) => {
              const worker = trabajadores.find(t => t.auth_user_id === rep.tecnico_id);
              const rFotos = rep.fotos_urls || [];
              const rFacturas = rep.facturas_urls || [];
              const hasImages = rFotos.length > 0 || rFacturas.length > 0;

              if (!hasImages) return null;

              return (
                <div key={rIdx} className="avoid-break border-t border-slate-100 pt-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-blue-600 text-white px-3 py-1 rounded font-black text-xs uppercase">
                      INT. #{rIdx + 1}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 uppercase">{worker ? `${worker.nombre} ${worker.apellidos}` : 'Técnico'}</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{worker?.especialidad || 'Operativo'} | {rep.fecha_trabajo || 'Registro técnico'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    {/* Photos of visit */}
                    {rFotos.map((url: string, fIdx: number) => (
                      <div key={`f-${fIdx}`} className="avoid-break">
                        <div className="aspect-video border-4 border-slate-50 rounded-lg overflow-hidden shadow-sm bg-slate-50">
                          <img src={url} alt="Evidencia Visita" className="w-full h-full object-cover" />
                        </div>
                        <p className="text-[8px] font-black text-blue-600 mt-2 uppercase tracking-tighter">Evidencia de Intervención</p>
                      </div>
                    ))}
                    {/* Invoices / Docs */}
                    {rFacturas.map((url: string, fcIdx: number) => (
                      <div key={`fc-${fcIdx}`} className="avoid-break">
                        <div className="aspect-video border-4 border-amber-50 rounded-lg overflow-hidden shadow-sm bg-amber-50/30">
                          <img src={url} alt="Factura/Albarán" className="w-full h-full object-cover" />
                        </div>
                        <p className="text-[8px] font-black text-amber-600 mt-2 uppercase tracking-tighter">Documentación / Factura / Albarán</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});

PrintableOrden.displayName = 'PrintableOrden';
