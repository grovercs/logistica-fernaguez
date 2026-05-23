import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { smartCompress } from '../../lib/compressImage';
import { uploadToCloudinary } from '../../lib/cloudinary';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  reporteData: any;
}

export default function EditarReporteModal({ isOpen, onClose, onUpdated, reporteData }: Props) {
  const [loading, setLoading] = useState(false);
  const [fotos, setFotos] = useState<string[]>([]);
  const [facturas, setFacturas] = useState<string[]>([]);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [uploadingFactura, setUploadingFactura] = useState(false);

  const [form, setForm] = useState({
    trabajo: '',
    materiales: '',
    horas: 0,
    fecha: ''
  });

  useEffect(() => {
    if (isOpen && reporteData) {
      const splitted = (reporteData.notas || '').split(/\n{1,2}MATERIALES:?\n?| MATERIALES: /i);
      const workFallback = splitted[0]?.trim() || '';
      const matsFallback = splitted[1]?.trim() || '';

      setForm({
        trabajo: reporteData.trabajo_realizado || workFallback,
        materiales: reporteData.material_utilizado || matsFallback,
        horas: Number(reporteData.horas_trabajadas) || 0,
        fecha: reporteData.fecha_trabajo || (reporteData.creado_en ? reporteData.creado_en.split('T')[0] : '')
      });

      setFotos(reporteData.fotos_urls || []);
      setFacturas(reporteData.facturas_urls || []);
    }
  }, [isOpen, reporteData]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'foto' | 'factura') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'foto') setUploadingFoto(true);
    else setUploadingFactura(true);

    try {
      // Compress image before upload (1280px max, 70% quality)
      const compressedFile = await smartCompress(file);

      // Generate descriptive filename: OB-2026-1234_2026-04-01_foto_1
      const ordenId = reporteData?.orden_id || 'unknown';
      const fecha = new Date().toISOString().split('T')[0];
      const count = type === 'foto' ? fotos.length + 1 : facturas.length + 1;
      const filename = `${ordenId}_${fecha}_${type}_${count}`;

      // Upload to Cloudinary with organized folder
      const folder = type === 'foto' ? 'logistica/visitas' : 'logistica/facturas';
      const result = await uploadToCloudinary(compressedFile, folder, filename);

      if (type === 'foto') setFotos(prev => [...prev, result.secure_url]);
      else setFacturas(prev => [...prev, result.secure_url]);
    } catch (err: any) {
      alert("Error al subir archivo: " + err.message);
    } finally {
      if (type === 'foto') setUploadingFoto(false);
      else setUploadingFactura(false);
    }
  };

  const removeFile = (url: string, type: 'foto' | 'factura') => {
    if (type === 'foto') setFotos(prev => prev.filter(u => u !== url));
    else setFacturas(prev => prev.filter(u => u !== url));
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const updatedData: any = {
      trabajo_realizado: form.trabajo,
      material_utilizado: form.materiales,
      horas_trabajadas: form.horas,
      fecha_trabajo: form.fecha,
      fotos_urls: fotos,
      facturas_urls: facturas,
      notas: `${form.trabajo}\n\nMATERIALES:\n${form.materiales}`
    };

    const { error: errFull } = await supabase.from('reportes').update(updatedData).eq('id', reporteData.id);

    if (errFull && (errFull.code === '42703' || errFull.message?.includes('column'))) {
        const fallbackData = {
            horas_trabajadas: form.horas,
            fotos_urls: fotos,
            notas: updatedData.notas
        };
        await supabase.from('reportes').update(fallbackData).eq('id', reporteData.id);
    }

    setLoading(false);
    if (onUpdated) onUpdated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg text-primary">
              <span className="material-symbols-outlined text-[24px]">edit_note</span>
            </div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Editar Registro Técnico</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <form id="editRepForm" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha Trabajo</label>
                <input 
                  type="date" 
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                  value={form.fecha}
                  onChange={e => setForm({...form, fecha: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Horas Invertidas</label>
                <input 
                  type="number" 
                  step="0.25"
                  min="0"
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                  value={form.horas}
                  onChange={e => setForm({...form, horas: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trabajo Realizado</label>
              <textarea 
                rows={3}
                required
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                value={form.trabajo}
                onChange={e => setForm({...form, trabajo: e.target.value})}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Materiales Utilizados</label>
              <textarea 
                rows={2}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                value={form.materiales}
                onChange={e => setForm({...form, materiales: e.target.value})}
              />
            </div>

            {/* FOTOS VISITA */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                Fotos de la Visita
                <span className="text-slate-300 font-normal">{fotos.length}/6</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {fotos.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-100 group">
                    <img src={url} alt="Visita" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => removeFile(url, 'foto')}
                      className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </div>
                ))}
                {fotos.length < 6 && (
                  <label className="aspect-square rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors">
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'foto')} disabled={uploadingFoto} />
                    {uploadingFoto ? (
                      <span className="material-symbols-outlined animate-spin text-primary">sync</span>
                    ) : (
                      <span className="material-symbols-outlined text-slate-400">add_a_photo</span>
                    )}
                  </label>
                )}
              </div>
            </div>

            {/* FACTURAS / ALBARANES */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                Facturas / Albaranes
                <span className="text-slate-300 font-normal">{facturas.length}/4</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {facturas.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border-2 border-amber-100 group">
                    <img src={url} alt="Factura" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => removeFile(url, 'factura')}
                      className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </div>
                ))}
                {facturas.length < 4 && (
                  <label className="aspect-square rounded-lg border-2 border-dashed border-amber-200 bg-amber-50/30 flex flex-col items-center justify-center cursor-pointer hover:bg-amber-50 transition-colors">
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'factura')} disabled={uploadingFactura} />
                    {uploadingFactura ? (
                      <span className="material-symbols-outlined animate-spin text-amber-500">sync</span>
                    ) : (
                      <span className="material-symbols-outlined text-amber-400">receipt_long</span>
                    )}
                  </label>
                )}
              </div>
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 shrink-0">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            form="editRepForm"
            disabled={loading || uploadingFoto || uploadingFactura}
            className="px-6 py-2.5 bg-sky-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-sky-500/20 hover:bg-sky-600 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span> : <span className="material-symbols-outlined text-[18px]">save</span>}
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}
