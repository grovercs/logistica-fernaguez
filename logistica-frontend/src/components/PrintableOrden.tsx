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
    <div ref={ref} className="bg-white text-slate-900 p-[15mm] w-[210mm] font-sans print:p-0 mx-auto" style={{ minHeight: '297mm' }}>
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-blue-600 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-blue-600 tracking-tight">FERNAGUEZ</h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Logística y Servicios Integrales</p>
          <div className="mt-4 text-[10px] text-slate-400 leading-tight space-y-0.5">
            <p>Soporte Técnico Especializado</p>
            <p>Servicio Local y Nacional</p>
            <p>Email: soporte@fernaguez.com</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-black text-slate-800 uppercase">Parte de Trabajo</h2>
          <p className="text-sm font-bold text-blue-600 mt-1">Nº REPORTE: {orden.id_legible}</p>
          <p className="text-xs text-slate-500 mt-2 font-medium uppercase tracking-tighter">FECHA EMISIÓN: {new Date().toLocaleDateString('es-ES')}</p>
        </div>
      </div>

      {/* Main Info Grid */}
      <div className="grid grid-cols-2 gap-x-12 gap-y-6 mb-10">
        <div className="space-y-4">
          <div className="border-l-4 border-blue-600 pl-3">
             <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cliente / Asegurado</h3>
             <p className="text-sm font-bold mt-0.5">{orden.cliente}</p>
             <p className="text-xs text-slate-600 mt-1">{orden.asegurado || 'Dato no disponible'}</p>
          </div>
          <div className="border-l-4 border-blue-600 pl-3">
             <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Póliza / Aseguradora</h3>
             <p className="text-sm font-bold mt-0.5">{orden.aseguradora}</p>
             <p className="text-xs text-slate-600 mt-1">{orden.poliza || 'S/N'}</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="border-l-4 border-slate-300 pl-3">
             <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Localización del Siniestro</h3>
             <p className="text-xs font-medium text-slate-700 leading-relaxed mt-1">{orden.direccion || 'No especificada en ficha'}</p>
          </div>
          <div className="border-l-4 border-slate-300 pl-3">
             <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Persona de Contacto</h3>
             <p className="text-xs font-medium text-slate-700 mt-1">{orden.persona_contacto || '---'} {orden.telefono_contacto ? `(${orden.telefono_contacto})` : ''}</p>
          </div>
        </div>
      </div>

      {/* Job Description */}
      <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-10">
          <h3 className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">Descripción del Encargo</h3>
          <p className="text-xs leading-relaxed text-slate-700 italic">"{orden.descripcion || 'Sin descripción detallada registrada.'}"</p>
      </div>

      {/* Interventions Section */}
      <div className="mb-10">
        <h3 className="text-xs font-bold text-slate-900 border-b-2 border-slate-200 pb-2 mb-4 uppercase tracking-tighter flex justify-between">
           <span>Detalle de Intervenciones Técnicas</span>
           <span className="text-slate-400 font-medium">TOTAL: {reportes.length}</span>
        </h3>
        <div className="space-y-6">
          {reportes.length > 0 ? reportes.map((rep, i) => {
             const worker = trabajadores.find(t => t.auth_user_id === rep.tecnico_id);
             return (
               <div key={i} className="relative pl-6 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-blue-100">
                  <div className="flex justify-between items-baseline mb-2">
                    <p className="text-xs font-bold text-slate-800 uppercase tracking-tight">Técnico: {worker ? `${worker.nombre} ${worker.apellidos}` : 'Servicio Técnico'}</p>
                    <p className="text-[10px] font-bold text-slate-500">{rep.fecha_trabajo || new Date(rep.creado_en).toLocaleDateString('es-ES')} | Horas: {rep.horas_trabajadas}</p>
                  </div>
                  <div className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap mb-2">
                    {rep.notas || 'Mantenimiento preventivo y correctivo realizado.'}
                  </div>
               </div>
             )
          }) : (
             <p className="text-xs italic text-slate-400 py-4 text-center border-2 border-dashed border-slate-100 rounded-lg uppercase tracking-widest font-bold">Pendiente de registro técnico</p>
          )}
        </div>
      </div>

      {/* Summary Row */}
      <div className="bg-blue-50/50 p-4 rounded-lg flex justify-end gap-12 mb-10 border border-blue-100">
          <div className="text-right">
             <p className="text-[9px] font-bold text-blue-600 uppercase">Total Tiempo</p>
             <p className="text-xl font-black text-blue-600">{totalHoras} H</p>
          </div>
          <div className="text-right">
             <p className="text-[9px] font-bold text-blue-600 uppercase">Certificación</p>
             <p className="text-xl font-black text-blue-600 uppercase">{orden.estado === 'Finalizada' ? 'CERRADA' : 'ORIGINAL'}</p>
          </div>
      </div>

      {/* Photos Section */}
      {(() => {
        const allFotos = reportes.flatMap(r => r.fotos_urls || []);
        if (allFotos.length === 0) return null;
        return (
          <div className="mb-10 page-break-before">
            <h3 className="text-xs font-bold text-slate-900 border-b-2 border-slate-200 pb-2 mb-4 uppercase tracking-tighter">Evidencias Fotográficas</h3>
            <div className="grid grid-cols-2 gap-4">
               {allFotos.map((url, idx) => (
                 <div key={idx} className="h-48 border border-slate-200 rounded overflow-hidden shadow-sm">
                    <img src={url} alt={`Evidencia ${idx}`} className="w-full h-full object-cover" />
                 </div>
               ))}
            </div>
          </div>
        )
      })()}

      {/* Signature Section */}
      <div className="mt-auto pt-10 border-t-2 border-slate-200">
        <div className="grid grid-cols-2 gap-20">
          <div className="text-center">
             <div className="h-24 border-b border-slate-300 flex items-end justify-center pb-2">
                <p className="text-[10px] text-slate-400 italic font-medium">Validado por Dpto. Técnico</p>
             </div>
             <p className="text-[10px] font-bold text-slate-700 mt-2 uppercase tracking-wide">Firma del Operativo</p>
          </div>
          <div className="text-center">
             <div className="h-24 border-b border-slate-300 flex items-center justify-center">
                {firmReporte?.firma_url ? (
                   <img src={firmReporte.firma_url} alt="Firma conforme" className="max-h-20 mix-blend-multiply" />
                ) : (
                   <p className="text-[10px] text-slate-400 italic">Pendiente de firma cliente</p>
                )}
             </div>
             <p className="text-[10px] font-bold text-slate-700 mt-2 uppercase tracking-wide">Conformidad Cliente</p>
             <p className="text-[8px] text-slate-500 mt-1 uppercase tracking-tighter font-medium">{orden.cliente}</p>
          </div>
        </div>
      </div>

      {/* Footer / Legal */}
      <div className="mt-12 text-[8px] text-slate-400 text-center leading-tight">
        <p>En cumplimiento de lo dispuesto en la normativa vigente en materia de protección de datos personales, le informamos que sus datos serán tratados por Fernaguez con la finalidad de gestionar la prestación del servicio técnico solicitado. Puede ejercer sus derechos de acceso, rectificación, supresión y portabilidad mediante comunicación escrita al departamento de administración.</p>
        <p className="mt-2 font-bold text-slate-500 uppercase">Logística Fernaguez - Expertos en Gestión Técnica de Siniestros y Reparaciones</p>
      </div>
    </div>
  );
});

PrintableOrden.displayName = 'PrintableOrden';
