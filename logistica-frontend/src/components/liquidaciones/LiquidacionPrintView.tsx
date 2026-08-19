import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface PrintLinea {
  reporte_id: string;
  fecha_trabajo: string;
  horas: number;
  orden_id: string | null;
  orden_numero: string;
  orden_descripcion: string;
  cliente_nombre: string;
  direccion: string;
}

interface PrintBonus {
  id: string;
  concepto: string;
  importe: number;
}

interface PrintData {
  id: string;
  trabajador_id: string;
  periodo: string;
  estado: 'abierta' | 'cerrada';
  horas_totales: number;
  tarifa_hora: number | null;
  usar_tarifa_puntual: boolean;
  importe_calculado: number;
  importe_manual: number | null;
  importe_aplicado: number;
  total_bonus: number;
  importe_nomina: number | null;
  total_liquidar: number;
  observaciones: string | null;
  trabajador_nombre: string;
  trabajador_apellidos: string;
  trabajador_especialidad: string;
  lineas: PrintLinea[];
  bonus: PrintBonus[];
}

const fmtCurrency = (n: number | null | undefined) => {
  if (n == null) return '-';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
};

const fmtNumber = (n: number | null | undefined, decimals = 2) => {
  if (n == null) return '-';
  return n.toFixed(decimals);
};

const periodoLabel = (periodo: string) => {
  const [year, month] = periodo.split('-');
  return `${month}/${year}`;
};

const parseErrorMessage = (error: { message?: string } | null | undefined): string => {
  const msg = error?.message || '';
  if (msg.includes('FORBIDDEN')) return 'No tienes permiso para realizar esta acción.';
  if (msg.includes('AUTH_REQUIRED')) return 'Debes iniciar sesión para continuar.';
  if (msg.includes('LIQUIDACION_NOT_FOUND')) return 'Liquidación no encontrada.';
  return msg || 'Ocurrió un error inesperado.';
};

export default function LiquidacionPrintView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<PrintData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!id) {
        if (mounted) {
          setError('ID de liquidación no proporcionado.');
          setLoading(false);
        }
        return;
      }
      const { data: rpcData, error: rpcError } = await supabase.rpc('admin_get_liquidacion_detalle_impresion', {
        p_liquidacion_id: id,
      });
      if (!mounted) return;
      if (rpcError) {
        setError(parseErrorMessage(rpcError));
        setLoading(false);
        return;
      }
      const rows = (rpcData || []) as Record<string, unknown>[];
      if (rows.length === 0) {
        setError('No se encontró la liquidación.');
        setLoading(false);
        return;
      }
      const row = rows[0];
      setData({
        id: row.id as string,
        trabajador_id: row.trabajador_id as string,
        periodo: row.periodo as string,
        estado: row.estado as 'abierta' | 'cerrada',
        horas_totales: (row.horas_totales as number | null) ?? 0,
        tarifa_hora: (row.tarifa_hora as number | null) ?? null,
        usar_tarifa_puntual: (row.usar_tarifa_puntual as boolean) ?? false,
        importe_calculado: (row.importe_calculado as number | null) ?? 0,
        importe_manual: (row.importe_manual as number | null) ?? null,
        importe_aplicado: (row.importe_aplicado as number | null) ?? 0,
        total_bonus: (row.total_bonus as number | null) ?? 0,
        importe_nomina: (row.importe_nomina as number | null) ?? null,
        total_liquidar: (row.total_liquidar as number | null) ?? 0,
        observaciones: (row.observaciones as string | null) ?? null,
        trabajador_nombre: (row.trabajador_nombre as string) || '',
        trabajador_apellidos: (row.trabajador_apellidos as string) || '',
        trabajador_especialidad: (row.trabajador_especialidad as string) || '',
        lineas: (row.lineas as PrintLinea[]) || [],
        bonus: (row.bonus as PrintBonus[]) || [],
      });
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 print:bg-white print:min-h-0">
        <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400 print:hidden">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          <p>Cargando vista de impresión...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-6 print:bg-white print:min-h-0 print:block">
        <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl shadow-2xl p-6 print:shadow-none print:max-w-none print:rounded-none print:p-0">
          <div className="text-red-600 dark:text-red-400 font-medium mb-4">{error || 'Error desconocido'}</div>
          <div className="print:hidden flex justify-end">
            <button
              onClick={() => navigate('/liquidaciones/gestion')}
              className="px-4 py-2 text-sm font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  const nombreCompleto = `${data.trabajador_nombre} ${data.trabajador_apellidos || ''}`.trim();

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 py-6 print:bg-white print:py-0 print:min-h-0">
      {/* Controles de pantalla */}
      <div className="max-w-[210mm] mx-auto mb-4 px-4 print:hidden flex items-center justify-end gap-2 sticky top-4 z-10">
        <button
          onClick={handlePrint}
          className="px-4 py-2 text-sm font-bold bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors flex items-center gap-2 shadow-sm"
        >
          <span className="material-symbols-outlined text-sm">print</span>
          Imprimir / PDF
        </button>
        <button
          onClick={() => navigate('/liquidaciones/gestion')}
          className="px-4 py-2 text-sm font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors shadow-sm"
        >
          Volver
        </button>
      </div>

      {/* Hoja A4 */}
      <div className="mx-auto max-w-[210mm] print:mx-0 print:max-w-none">
        <div className="bg-white text-slate-900 p-8 print:p-0 shadow-2xl print:shadow-none">
          <style>{`
            @media print {
              @page { size: A4; margin: 16mm; }
              body { background: white; }
            }
          `}</style>

          {/* Cabecera */}
          <div className="flex items-start justify-between border-b-2 border-slate-200 pb-4 mb-6">
            <div>
              <h1 className="text-2xl font-black text-slate-900">LIQUIDACIÓN</h1>
              <p className="text-sm text-slate-500 mt-1">Logística Fernaguez</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Periodo</p>
              <p className="text-xl font-bold text-slate-900">{periodoLabel(data.periodo)}</p>
              <p className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold mt-2 ${
                data.estado === 'cerrada'
                  ? 'bg-slate-100 text-slate-700'
                  : 'bg-emerald-100 text-emerald-800'
              }`}>
                {data.estado === 'cerrada' ? 'Cerrada' : 'Abierta'}
              </p>
            </div>
          </div>

          {/* Trabajador */}
          <div className="mb-6">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Trabajador</p>
            <p className="text-lg font-bold text-slate-900">{nombreCompleto}</p>
            {data.trabajador_especialidad && (
              <p className="text-sm text-slate-500">{data.trabajador_especialidad}</p>
            )}
          </div>

          {/* Resumen importes */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Horas totales</p>
              <p className="text-lg font-bold text-slate-900">{fmtNumber(data.horas_totales, 1)} h</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tarifa / hora</p>
              <p className="text-lg font-bold text-slate-900">{fmtCurrency(data.tarifa_hora)}</p>
              {data.usar_tarifa_puntual && (
                <p className="text-[10px] font-bold text-amber-600 mt-0.5">Tarifa puntual</p>
              )}
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Importe calculado</p>
              <p className="text-lg font-bold text-slate-900">{fmtCurrency(data.importe_calculado)}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Importe aplicado</p>
              <p className="text-lg font-bold text-slate-900">{fmtCurrency(data.importe_aplicado)}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{data.importe_manual == null ? 'Automático' : 'Manual'}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 border border-slate-200 rounded-lg">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Bonus</p>
              <p className="text-lg font-bold text-emerald-700">+ {fmtCurrency(data.total_bonus)}</p>
            </div>
            <div className="text-center p-3 border border-slate-200 rounded-lg">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nómina</p>
              <p className="text-lg font-bold text-red-700">- {fmtCurrency(data.importe_nomina)}</p>
            </div>
            <div className="text-center p-3 bg-primary text-white rounded-lg">
              <p className="text-[10px] font-bold text-white/80 uppercase tracking-wider">Total a liquidar</p>
              <p className="text-xl font-black">{fmtCurrency(data.total_liquidar)}</p>
            </div>
          </div>

          {/* Observaciones */}
          {data.observaciones && (
            <div className="mb-6">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Observaciones</p>
              <p className="text-sm text-slate-700 whitespace-pre-line bg-slate-50 p-3 rounded-lg">{data.observaciones}</p>
            </div>
          )}

          {/* Tabla de partes / reportes */}
          <div className="mb-6">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Detalle de partes / reportes</p>
            {data.lineas.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No hay partes incluidos.</p>
            ) : (
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300">
                    <th className="px-3 py-2 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Fecha</th>
                    <th className="px-3 py-2 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Orden</th>
                    <th className="px-3 py-2 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Cliente</th>
                    <th className="px-3 py-2 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Dirección</th>
                    <th className="px-3 py-2 text-[10px] font-bold text-slate-600 uppercase tracking-wider text-right">Horas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.lineas.map((linea, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-3 py-2">{linea.fecha_trabajo ? new Date(linea.fecha_trabajo).toLocaleDateString('es-ES') : '-'}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{linea.orden_numero}</div>
                        {linea.orden_descripcion && <div className="text-xs text-slate-500">{linea.orden_descripcion}</div>}
                      </td>
                      <td className="px-3 py-2">{linea.cliente_nombre || '-'}</td>
                      <td className="px-3 py-2 text-xs text-slate-500">{linea.direccion || '-'}</td>
                      <td className="px-3 py-2 text-right font-bold">{fmtNumber(linea.horas, 1)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300 bg-slate-50">
                    <td colSpan={4} className="px-3 py-2 text-right font-bold text-slate-700">Total horas</td>
                    <td className="px-3 py-2 text-right font-black">{fmtNumber(data.horas_totales, 1)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* Bonus detallados */}
          {data.bonus.length > 0 && (
            <div className="mb-6">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Bonus</p>
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300">
                    <th className="px-3 py-2 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Concepto</th>
                    <th className="px-3 py-2 text-[10px] font-bold text-slate-600 uppercase tracking-wider text-right">Importe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.bonus.map((b, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-3 py-2">{b.concepto}</td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-700">+ {fmtCurrency(b.importe)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pie */}
          <div className="mt-10 pt-4 border-t border-slate-200 text-xs text-slate-400 flex justify-between">
            <span>Generado el {new Date().toLocaleDateString('es-ES')}</span>
            <span>Liquidación #{data.id.slice(0, 8)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
