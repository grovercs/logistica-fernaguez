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

  const hasAnexos = reportes.some(r => ((r.fotos_urls?.length || 0) + (r.facturas_urls?.length || 0)) > 0);

  return (
    <div ref={ref} className="bg-white text-slate-900 w-[210mm] font-sans mx-auto printable-container">
      <style>{`
        @page {
          size: A4;
          margin: 10mm 15mm 22mm 15mm;
        }
        @media print {
          body {
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
          }
          .printable-container {
             width: 100% !important;
             margin: 0 !important;
             padding: 0 !important;
             min-height: auto !important;
          }
        }
        .printable-container {
           width: 210mm;
           padding: 0 15mm;
           box-sizing: border-box;
        }
        .page-footer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 22mm;
          text-align: center;
          font-size: 8px;
          color: #94a3b8;
          background: white;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 0 15mm;
          box-sizing: border-box;
          border-top: 1px solid #e2e8f0;
        }
        .page-break {
          page-break-before: always;
          break-before: page;
        }
        .no-break {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .section-title {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #1e293b;
          border-bottom: 1px solid #cbd5e1;
          padding-bottom: 4px;
          margin-bottom: 12px;
        }
        .label {
          font-size: 8px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #64748b;
          margin-bottom: 2px;
        }
        .value {
          font-size: 11px;
          font-weight: 600;
          color: #0f172a;
        }
        .intervention-box {
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 10px 12px;
          margin-bottom: 10px;
          background: #fafafa;
        }
        .intervention-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
          padding-bottom: 6px;
          border-bottom: 1px dashed #cbd5e1;
        }
        .worker-name {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          color: #1e293b;
        }
        .worker-meta {
          font-size: 8px;
          color: #475569;
          font-weight: 600;
        }
        .intervention-date {
          font-size: 9px;
          font-weight: 700;
          color: #64748b;
          white-space: nowrap;
        }
        .intervention-body {
          font-size: 10px;
          line-height: 1.5;
          color: #334155;
          white-space: pre-wrap;
        }
        .summary-box {
          background: #2563eb;
          color: white;
          border-radius: 8px;
          padding: 14px 20px;
          display: flex;
          justify-content: flex-end;
          gap: 40px;
        }
        .summary-label {
          font-size: 8px;
          font-weight: 700;
          text-transform: uppercase;
          opacity: 0.8;
          letter-spacing: 0.05em;
        }
        .summary-value {
          font-size: 22px;
          font-weight: 900;
          line-height: 1;
        }
      `}</style>

      {/* FOOTER - se repite en cada página */}
      <div className="page-footer">
        <p className="font-bold text-slate-600 uppercase mb-0.5">Logística Fernaguez - Servicios de Logística, Reformas y Mantenimiento</p>
        <p>Reporte Nº {orden.id_legible} | Fecha de Impresión: {new Date().toLocaleDateString('es-ES')} | app.appvielha.com</p>
        <p className="mt-0.5 text-[7px] opacity-50">Documento de carácter técnico. Los datos contenidos están sujetos a la normativa vigente de protección de datos (RGPD).</p>
      </div>

      <div className="w-full">
        {/* ===== HEADER INSTITUCIONAL ===== */}
        <div className="flex justify-between items-start border-b-2 border-blue-600 pb-5 mb-6">
          <div className="flex flex-col gap-1">
            <img src="/logo_fernaguez_blk.png" alt="Fernaguez" className="h-12 w-auto object-contain" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Logística · Reformas · Servicios</p>
            <div className="mt-3 text-[9px] text-slate-400 leading-tight">
              <p>Soporte Técnico: soporte@fernaguez.com</p>
              <p>Gestión de Intervenciones 24/7</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Reporte de Servicio</h2>
            <p className="text-sm font-bold text-blue-600 mt-1">Nº ORDEN: {orden.id_legible}</p>
            <p className="text-[10px] text-slate-500 mt-1 font-medium uppercase">Emitido: {new Date().toLocaleDateString('es-ES')}</p>
          </div>
        </div>

        {/* ===== DATOS DEL SERVICIO ===== */}
        <div className="no-break mb-6">
          <div className="section-title">Datos del Servicio</div>
          <div className="grid grid-cols-2 gap-x-10 gap-y-3">
            <div>
              <div className="label">Titular del Servicio</div>
              <div className="value">{orden.cliente || 'No especificado'}</div>
              <div className="text-[9px] text-slate-500 mt-0.5 font-medium">
                {orden.aseguradora ? 'Empresa' : 'Cliente Particular'} | Ref: {orden.poliza || 'S/N'}
              </div>
            </div>
            <div>
              <div className="label">Ubicación</div>
              <div className="value text-[11px]">{orden.direccion || 'No especificada'}</div>
            </div>
            <div>
              <div className="label">Contacto</div>
              <div className="value text-[11px]">
                {orden.asegurado || '---'}
                {orden.telefono_asegurado ? <span className="text-slate-500 font-normal"> ({orden.telefono_asegurado})</span> : null}
              </div>
            </div>
            <div>
              <div className="label">Estado</div>
              <div className="value" style={{ color: orden.estado === 'Finalizada' ? '#16a34a' : '#2563eb' }}>
                {orden.estado === 'Finalizada' ? 'Finalizada / Certificada' : orden.estado || 'En Curso'}
              </div>
            </div>
          </div>
        </div>

        {/* ===== DESCRIPCIÓN DEL ENCARGO ===== */}
        <div className="no-break mb-6">
          <div className="section-title">Descripción del Encargo</div>
          <div className="bg-slate-50 p-3 rounded border border-slate-200">
            <p className="text-[10px] leading-relaxed text-slate-700 italic">
              "{orden.descripcion || 'Sin descripción detallada.'}"
            </p>
          </div>
        </div>

        {/* ===== DETALLE DE TRABAJOS REALIZADOS ===== */}
        <div className="mb-6">
          <div className="section-title">Detalle de Trabajos Realizados</div>
          {reportes.length > 0 ? (
            <div className="space-y-3">
              {reportes.map((rep, i) => {
                const worker = trabajadores.find(t => t.auth_user_id === rep.tecnico_id);
                return (
                  <div key={i} className="intervention-box no-break">
                    <div className="intervention-header">
                      <div>
                        <span className="worker-name">
                          {worker ? `${worker.nombre} ${worker.apellidos}` : 'Servicio Técnico'}
                        </span>
                        {worker?.especialidad && (
                          <span className="worker-meta ml-2">({worker.especialidad})</span>
                        )}
                      </div>
                      <span className="intervention-date">
                        {rep.fecha_trabajo || new Date(rep.creado_en).toLocaleDateString('es-ES')} · {rep.horas_trabajadas || 0}h
                      </span>
                    </div>
                    <div className="intervention-body">
                      {rep.notas || 'Sin notas registradas.'}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-[10px] italic text-slate-400 py-4 text-center border border-dashed border-slate-300 rounded uppercase bg-slate-50">
              No hay reportes de trabajo registrados todavía
            </div>
          )}
        </div>

        {/* ===== RESUMEN + FIRMAS (siempre juntas, nunca partidas) ===== */}
        <div className="no-break mt-4">
          <div className="summary-box">
            <div className="text-right">
              <div className="summary-label">Total Horas Invertidas</div>
              <div className="summary-value">{totalHoras} H</div>
            </div>
            <div className="text-right">
              <div className="summary-label">Estado Final</div>
              <div className="summary-value uppercase">{orden.estado === 'Finalizada' ? 'Certificada' : 'En Curso'}</div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="grid grid-cols-2 gap-16">
              <div className="text-center">
                <div className="h-20 border-b border-slate-300 flex items-end justify-center pb-2">
                  <span className="text-[9px] text-slate-400 italic">Validado por Operativo</span>
                </div>
                <p className="text-[10px] font-bold text-slate-700 mt-2 uppercase tracking-widest">Firma Técnico</p>
              </div>
              <div className="text-center">
                <div className="h-20 border-b border-slate-300 flex items-center justify-center">
                  {firmReporte?.firma_url ? (
                    <img src={firmReporte.firma_url} alt="Firma cliente" className="max-h-16 mix-blend-multiply" />
                  ) : (
                    <span className="text-[9px] text-slate-300 italic">Pendiente de firma del cliente</span>
                  )}
                </div>
                <p className="text-[10px] font-bold text-slate-700 mt-2 uppercase tracking-widest">Conformidad Cliente</p>
                <p className="text-[8px] text-slate-400 mt-0.5 uppercase font-medium">{orden.cliente}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ===== ANEXO FOTOGRÁFICO - siempre página nueva ===== */}
        {hasAnexos && (
          <div className="page-break mt-0">
            <div className="border-b-2 border-slate-900 pb-3 mb-6">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Anexo de Evidencias</h3>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Documentación fotográfica y albaranes</p>
            </div>

            <div className="space-y-8">
              {reportes.map((rep, rIdx) => {
                const worker = trabajadores.find(t => t.auth_user_id === rep.tecnico_id);
                const rFotos = rep.fotos_urls || [];
                const rFacturas = rep.facturas_urls || [];
                if (rFotos.length === 0 && rFacturas.length === 0) return null;

                return (
                  <div key={rIdx} className="no-break">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="bg-blue-600 text-white px-2 py-0.5 rounded font-black text-[10px] uppercase">
                        INT. #{rIdx + 1}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-800 uppercase">
                          {worker ? `${worker.nombre} ${worker.apellidos}` : 'Técnico'}
                        </p>
                        <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">
                          {worker?.especialidad || 'Operativo'} | {rep.fecha_trabajo || 'Registro técnico'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {rFotos.map((url: string, fIdx: number) => (
                        <div key={`f-${fIdx}`} className="no-break">
                          <div className="aspect-video border-2 border-slate-100 rounded overflow-hidden bg-slate-50">
                            <img src={url} alt="Evidencia" className="w-full h-full object-cover" />
                          </div>
                          <p className="text-[8px] font-bold text-blue-600 mt-1 uppercase tracking-tighter">Evidencia de Intervención</p>
                        </div>
                      ))}
                      {rFacturas.map((url: string, fcIdx: number) => (
                        <div key={`fc-${fcIdx}`} className="no-break">
                          <div className="aspect-video border-2 border-amber-100 rounded overflow-hidden bg-amber-50/30">
                            <img src={url} alt="Factura/Albarán" className="w-full h-full object-cover" />
                          </div>
                          <p className="text-[8px] font-bold text-amber-600 mt-1 uppercase tracking-tighter">Documentación / Factura / Albarán</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

PrintableOrden.displayName = 'PrintableOrden';
