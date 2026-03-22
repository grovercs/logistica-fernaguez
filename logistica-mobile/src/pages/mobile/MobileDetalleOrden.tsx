import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { compressImage } from '../../lib/compressImage';

const MobileDetalleOrden = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const [orden, setOrden] = useState<any>(null);
    const [reporte, setReporte] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [currentUserName, setCurrentUserName] = useState<string>('');
    
    // Form state corresponding to the design
    const [fecha, setFecha] = useState('');
    const [trabajoRealizado, setTrabajoRealizado] = useState('');
    const [materialUtilizado, setMaterialUtilizado] = useState('');
    const [selectedHora, setSelectedHora] = useState(0);
    const [selectedMinuto, setSelectedMinuto] = useState(0);
    
    const [submitting, setSubmitting] = useState(false);
    
    // Photo upload state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fotos, setFotos] = useState<string[]>([]);
    const [uploadingFoto, setUploadingFoto] = useState(false);
    const [fotoPreviews, setFotoPreviews] = useState<string[]>([]);

    // Invoice/receipt photo state
    const facturaInputRef = useRef<HTMLInputElement>(null);
    const [facturas, setFacturas] = useState<string[]>([]);
    const [uploadingFactura, setUploadingFactura] = useState(false);
    const [facturaPreviews, setFacturaPreviews] = useState<string[]>([]);
    
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);

    useEffect(() => {
        if (id) fetchOrden();
    }, [id]);

    const fetchOrden = async () => {
        // Get the current logged-in user
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id || null;
        setCurrentUserId(userId);

        // Get the technician's name from the trabajadores table
        if (userId) {
            const { data: trabData } = await supabase
                .from('trabajadores')
                .select('nombre, apellidos')
                .eq('auth_user_id', userId)
                .maybeSingle();
            if (trabData) {
                setCurrentUserName(`${trabData.nombre} ${trabData.apellidos}`.trim());
            } else {
                // Fallback to email
                setCurrentUserName(userData?.user?.email || 'Técnico');
            }
        }

        const [ordenReq, reporteReq] = await Promise.all([
            supabase.from('ordenes').select('*').eq('id', id).single(),
            userId ? supabase.from('reportes').select('*').eq('orden_id', id).eq('tecnico_id', userId).maybeSingle() : Promise.resolve({ data: null, error: null })
        ]);
        
        if (!ordenReq.error && ordenReq.data) {
            setOrden(ordenReq.data);
            setTrabajoRealizado(ordenReq.data.descripcion || '');
            if (ordenReq.data.creado_en) {
                setFecha(new Date(ordenReq.data.creado_en).toISOString().split('T')[0]);
            }
        }
        
        if (!reporteReq.error && reporteReq.data) {
            setReporte(reporteReq.data);
            setMaterialUtilizado(reporteReq.data.notas || '');
            if (reporteReq.data.firma_url) setHasSignature(true);
            
            // Load previously saved hours
            const totalHours = reporteReq.data.horas_trabajadas || 0;
            setSelectedHora(Math.floor(totalHours));
            setSelectedMinuto(Math.round((totalHours % 1) * 60));

            // Restore previously uploaded photos
            if (reporteReq.data.fotos_urls?.length > 0) {
                setFotos(reporteReq.data.fotos_urls);
                setFotoPreviews(reporteReq.data.fotos_urls);
            }
            // Restore previously uploaded invoices
            if (reporteReq.data.facturas_urls?.length > 0) {
                setFacturas(reporteReq.data.facturas_urls);
                setFacturaPreviews(reporteReq.data.facturas_urls);
            }
        }
        setLoading(false);
    };

    // --- Photo Upload ---
    const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploadingFoto(true);
        const newUrls: string[] = [];
        const newPreviews: string[] = [];

        for (const file of Array.from(files)) {
            try {
                // 1. Show local preview immediately
                const localPreview = URL.createObjectURL(file);
                newPreviews.push(localPreview);

                // 2. Compress the image (max 1920px, JPEG 80%)
                const compressed = await compressImage(file);
                const sizeKB = Math.round(compressed.size / 1024);
                console.log(`Compressed ${file.name}: ${Math.round(file.size/1024)}KB → ${sizeKB}KB`);

                // 3. Upload to Supabase Storage
                const fileName = `${id}/${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, '_')}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('fotos-reportes')
                    .upload(fileName, compressed, { contentType: 'image/jpeg', upsert: false });

                if (uploadError) throw uploadError;

                // 4. Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('fotos-reportes')
                    .getPublicUrl(uploadData.path);

                newUrls.push(publicUrl);
            } catch (err) {
                console.error('Error uploading photo:', err);
                alert('Error al subir una foto. Revisa tu conexión e inténtalo de nuevo.');
            }
        }

        setFotos(prev => [...prev, ...newUrls]);
        setFotoPreviews(prev => [...prev, ...newPreviews]);
        setUploadingFoto(false);

        // Reset input so the same file can be re-selected if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // --- Delete a Photo ---
    const handleDeleteFoto = async (index: number) => {
        const urlToDelete = fotos[index];
        if (!urlToDelete) {
            // Photo still uploading — just remove preview
            setFotoPreviews(prev => prev.filter((_, i) => i !== index));
            return;
        }

        // Extract storage path from the public URL
        // URL format: .../storage/v1/object/public/fotos-reportes/PATH
        const marker = '/fotos-reportes/';
        const pathStart = urlToDelete.indexOf(marker);
        const storagePath = pathStart !== -1 ? urlToDelete.slice(pathStart + marker.length) : null;

        if (storagePath) {
            const { error } = await supabase.storage
                .from('fotos-reportes')
                .remove([storagePath]);
            if (error) {
                console.error('Error deleting photo:', error);
                alert('No se pudo borrar la foto del servidor.');
                return;
            }
        }

        setFotos(prev => prev.filter((_, i) => i !== index));
        setFotoPreviews(prev => prev.filter((_, i) => i !== index));
    };

    // --- Invoice Photo Upload ---
    const handleFacturaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setUploadingFactura(true);
        const newUrls: string[] = [];
        const newPreviews: string[] = [];
        for (const file of Array.from(files)) {
            try {
                newPreviews.push(URL.createObjectURL(file));
                const compressed = await compressImage(file, 2400, 0.9); // Higher quality for invoices
                const fileName = `facturas/${id}/${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, '_')}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('fotos-reportes')
                    .upload(fileName, compressed, { contentType: 'image/jpeg', upsert: false });
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage.from('fotos-reportes').getPublicUrl(uploadData.path);
                newUrls.push(publicUrl);
            } catch (err) {
                console.error('Error uploading invoice:', err);
                alert('Error al subir la factura.');
            }
        }
        setFacturas(prev => [...prev, ...newUrls]);
        setFacturaPreviews(prev => [...prev, ...newPreviews]);
        setUploadingFactura(false);
        if (facturaInputRef.current) facturaInputRef.current.value = '';
    };

    const handleDeleteFactura = async (index: number) => {
        const urlToDelete = facturas[index];
        if (!urlToDelete) {
            setFacturaPreviews(prev => prev.filter((_, i) => i !== index));
            return;
        }
        const marker = '/fotos-reportes/';
        const pathStart = urlToDelete.indexOf(marker);
        const storagePath = pathStart !== -1 ? urlToDelete.slice(pathStart + marker.length) : null;
        if (storagePath) {
            const { error } = await supabase.storage.from('fotos-reportes').remove([storagePath]);
            if (error) { alert('No se pudo borrar la factura.'); return; }
        }
        setFacturas(prev => prev.filter((_, i) => i !== index));
        setFacturaPreviews(prev => prev.filter((_, i) => i !== index));
    };

    // --- Sign Pad Logic ---
    const startDrawing = (e: any) => {
        if (reporte?.firma_url) return; // Don't draw if already has a saved signature image
        setIsDrawing(true);
        draw(e);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) ctx.beginPath(); // Reset path
            
            // Check if there is something drawn by seeing if we can get image data
            setHasSignature(true); 
        }
    };

    const draw = (e: any) => {
        if (!isDrawing || !canvasRef.current) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const isTouch = e.type.includes('touch');
        const clientX = isTouch ? e.nativeEvent.touches[0].clientX : e.clientX;
        const clientY = isTouch ? e.nativeEvent.touches[0].clientY : e.clientY;
        
        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;

        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#0f172a'; 

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const clearSignature = () => {
        if (reporte?.firma_url) {
            setReporte({...reporte, firma_url: null});
        }
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
        setHasSignature(false);
    };

    // --- Submit Logic ---
    const handleComplete = async () => {
        setSubmitting(true);
        
        let signatureDataUrl = reporte?.firma_url;
        if (!signatureDataUrl && canvasRef.current && hasSignature) {
            signatureDataUrl = canvasRef.current.toDataURL('image/png');
        }
        
        const parsedHoras = selectedHora + (selectedMinuto / 60);

        const reportData = {
            orden_id: id,
            tecnico_id: currentUserId,
            notas: materialUtilizado,
            firma_url: signatureDataUrl,
            horas_trabajadas: parsedHoras,
            fecha_trabajo: fecha || new Date().toISOString().split('T')[0],
            fotos_urls: fotos,
            facturas_urls: facturas,
        };

        let errorReporte = null;
        
        if (reporte?.id) {
            const { error: errUpdate } = await supabase
                .from('reportes')
                .update(reportData)
                .eq('id', reporte.id);
            errorReporte = errUpdate;
        } else {
            const { error: errInsert } = await supabase
                .from('reportes')
                .insert(reportData);
            errorReporte = errInsert;
        }

        if (errorReporte) {
            console.error(errorReporte);
            alert("Error al guardar el reporte técnico.");
            setSubmitting(false);
            return;
        }
        
        // Mark order as 'En Curso' when a tech submits a report.
        // 'Finalizada' only happens when the client signs (managed from admin panel).
        await supabase
            .from('ordenes')
            .update({ 
                estado: 'En Curso',
            })
            .eq('id', id)
            .eq('estado', 'Pendiente'); // Only update if still 'Pendiente'

        setSubmitting(false);
        alert("¡Reporte añadido correctamente!");
        navigate('/m/ordenes');
    };

    if (loading) return <div className="p-8 text-center text-slate-500 font-bold mt-20">Cargando...</div>;

    return (
        <div className="bg-[#f0f2f5] min-h-[100dvh] font-sans pb-10">
            {/* Top Bar matching the design */}
            <div className="bg-white px-4 py-4 flex items-center justify-between shadow-sm sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/m/ordenes')} className="text-slate-600">
                        <span className="material-symbols-outlined select-none">arrow_back</span>
                    </button>
                    <h1 className="text-lg font-bold text-slate-800">Intervención: {orden?.id_legible}</h1>
                </div>
                <button className="text-slate-500">
                    <span className="material-symbols-outlined select-none">more_vert</span>
                </button>
            </div>

            {/* INTERVENTION DATA */}
            <div className="bg-white p-5 space-y-4 shadow-sm border-b border-slate-200">
                 <div className="flex justify-between items-start">
                     <div>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Cliente Comercial / Títular</p>
                         <h2 className="text-lg font-bold text-slate-800 leading-tight mt-1">{orden?.cliente}</h2>
                     </div>
                     <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-1 rounded-lg uppercase">
                         {orden?.aseguradora || 'Particular'}
                     </span>
                 </div>

                 {/* Asegurado y Teléfono */}
                 {(orden?.asegurado || orden?.telefono_asegurado) && (
                     <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                         <div>
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Asegurado</p>
                             <p className="text-sm font-semibold text-slate-700 mt-1">{orden?.asegurado || '-'}</p>
                         </div>
                         <div>
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">call</span>Teléfono</p>
                             {orden?.telefono_asegurado ? (
                                 <a href={`tel:${orden.telefono_asegurado}`} className="text-sm font-bold text-blue-600 mt-1 block">{orden.telefono_asegurado}</a>
                             ) : (
                                 <p className="text-sm text-slate-400 mt-1">-</p>
                             )}
                         </div>
                     </div>
                 )}
                 
                 {/* Dirección */}
                 <div className="pt-3 border-t border-slate-100">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">location_on</span>Dirección Completa</p>
                     <p className="text-sm font-semibold text-slate-700 mt-1">{orden?.direccion || 'No especificada'}</p>
                 </div>

                 {/* Contacto Alternativo */}
                 {(orden?.persona_contacto || orden?.telefono_contacto) && (
                     <div className="pt-3 border-t border-slate-100 bg-orange-50/50 p-3 rounded-lg border border-orange-100">
                         <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest leading-tight mb-1 flex items-center gap-1">Contacto Alternativo</p>
                         <p className="text-sm font-medium text-slate-700">{orden?.persona_contacto || '-'} {orden?.telefono_contacto && <>— <a href={`tel:${orden.telefono_contacto}`} className="text-blue-600 font-bold">{orden.telefono_contacto}</a></>}</p>
                     </div>
                 )}
                 
                 <div className="pt-3 border-t border-slate-100">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight flex justify-between items-center">
                         Motivo / Notas Adicionales 
                         <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold">Póliza: {orden?.poliza || '-'}</span>
                     </p>
                     <p className="text-sm text-slate-700 mt-2 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-inner italic break-words">
                         {orden?.descripcion || 'Sin descripción detallada de la avería'}
                     </p>
                 </div>
            </div>

            <div className="p-5 space-y-6">
                {/* GENERAL INFORMATION */}
                <div className="space-y-4">
                    <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1">Información General</h2>
                    
                    {/* Fecha */}
                    <div>
                        <label className="block text-xs font-bold text-slate-800 mb-2 pl-1">Fecha</label>
                        <div className="relative">
                            <input 
                                type="date"
                                className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-4 pr-10 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm appearance-none"
                                value={fecha}
                                onChange={e => setFecha(e.target.value)}
                            />
                            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none select-none text-[20px]">calendar_today</span>
                        </div>
                    </div>

                    {/* Horas y Minutos with simple +/- buttons */}
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                             <label className="block text-xs font-bold text-slate-800 mb-2 pl-1">Horas trabajadas</label>
                             <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-between px-4 py-3">
                                <button 
                                    type="button"
                                    onClick={() => setSelectedHora(Math.max(0, selectedHora - 1))}
                                    className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-200 active:scale-95 transition-all font-bold text-lg"
                                >
                                    −
                                </button>
                                <span className="text-2xl font-black text-blue-500">{selectedHora.toString().padStart(2, '0')}</span>
                                <button 
                                    type="button"
                                    onClick={() => setSelectedHora(selectedHora + 1)}
                                    className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-200 active:scale-95 transition-all font-bold text-lg"
                                >
                                    +
                                </button>
                             </div>
                         </div>
                         <div>
                             <label className="block text-xs font-bold text-slate-800 mb-2 pl-1">Minutos</label>
                             <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-between px-4 py-3">
                                <button 
                                    type="button"
                                    onClick={() => setSelectedMinuto(Math.max(0, selectedMinuto - 15))}
                                    className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-200 active:scale-95 transition-all font-bold text-lg"
                                >
                                    −
                                </button>
                                <span className="text-2xl font-black text-blue-500">{selectedMinuto.toString().padStart(2, '0')}</span>
                                <button 
                                    type="button"
                                    onClick={() => setSelectedMinuto(Math.min(45, selectedMinuto + 15))}
                                    className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-200 active:scale-95 transition-all font-bold text-lg"
                                >
                                    +
                                </button>
                             </div>
                         </div>
                    </div>

                    {/* Trabajador (read-only, shows logged-in user) */}
                    <div>
                        <label className="block text-xs font-bold text-slate-800 mb-2 pl-1">Técnico</label>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary text-[20px]">engineering</span>
                            <span className="text-sm font-bold text-slate-800">{currentUserName || 'Cargando...'}</span>
                        </div>
                    </div>
                </div>

                {/* REPORT DETAILS */}
                <div className="space-y-4 pt-2">
                    <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1">Detalles del Reporte</h2>
                    
                    {/* Trabajo Realizado */}
                    <div>
                        <label className="block text-xs font-bold text-slate-800 mb-2 pl-1">Trabajo Realizado</label>
                        <textarea 
                            rows={3}
                            placeholder="Describa el trabajo realizado..."
                            className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm resize-none"
                            value={trabajoRealizado}
                            onChange={(e) => setTrabajoRealizado(e.target.value)}
                        />
                    </div>

                    {/* Material Utilizado */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold text-slate-800 pl-1">Material Utilizado</label>
                            <button
                                type="button"
                                onClick={() => facturaInputRef.current?.click()}
                                disabled={uploadingFactura}
                                className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg active:scale-95 transition-all disabled:opacity-50"
                            >
                                {uploadingFactura
                                    ? <><span className="material-symbols-outlined text-[14px] animate-spin">refresh</span> Subiendo...</>
                                    : <><span className="material-symbols-outlined text-[14px]">receipt_long</span> Foto factura</>}
                            </button>
                        </div>
                        {/* Hidden invoice file input */}
                        <input
                            ref={facturaInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleFacturaUpload}
                        />
                        <textarea 
                            rows={3}
                            placeholder="Lista de materiales utilizados..."
                            className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm resize-none"
                            value={materialUtilizado}
                            onChange={(e) => setMaterialUtilizado(e.target.value)}
                        />
                        {/* Invoice photo previews */}
                        {facturaPreviews.length > 0 && (
                            <div className="mt-2 space-y-1.5">
                                <p className="text-[10px] font-bold text-amber-700 pl-1 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px]">receipt_long</span>
                                    {facturaPreviews.length} factura{facturaPreviews.length !== 1 ? 's' : ''} adjunta{facturaPreviews.length !== 1 ? 's' : ''}
                                </p>
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {facturaPreviews.map((src, i) => (
                                        <div key={i} className="relative shrink-0">
                                            <img
                                                src={src}
                                                alt={`Factura ${i + 1}`}
                                                className={`w-20 h-20 object-cover rounded-xl border-2 ${i < facturas.length ? 'border-amber-400' : 'border-blue-300 opacity-60'}`}
                                            />
                                            {i < facturas.length && (
                                                <span className="absolute top-1 right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-white text-[10px]">receipt_long</span>
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteFactura(i)}
                                                className="absolute top-0.5 left-0.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-md active:scale-90 transition-all"
                                            >
                                                <span className="material-symbols-outlined text-white text-[12px]">close</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* FIRMA DEL CLIENTE */}
                <div className="space-y-4 pt-2">
                    <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1">Firma Del Cliente</h2>
                    
                    {/* Warning Box (Only show if no signature yet) */}
                    {!hasSignature && (
                        <div className="bg-[#fff9e6] border border-[#ffe082] rounded-xl p-3 flex items-center gap-3">
                            <span className="material-symbols-outlined text-orange-500 select-none">warning</span>
                            <span className="text-xs font-bold text-orange-800 tracking-wide">PENDIENTE DE FIRMA</span>
                        </div>
                    )}

                    {/* Canvas Area */}
                    <div className="bg-white border-2 border-dashed border-[#d1d5db] rounded-xl overflow-hidden touch-none relative h-[200px]">
                        {reporte?.firma_url ? (
                            <img src={reporte.firma_url} alt="Firma Guardada" className="w-full h-full object-contain" />
                        ) : (
                            <>
                                {!hasSignature && (
                                    <span className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 font-sans text-sm select-none">
                                        Espacio para firma
                                    </span>
                                )}
                                <canvas 
                                    ref={canvasRef}
                                    className="w-full h-full relative z-10 cursor-crosshair"
                                    onMouseDown={startDrawing}
                                    onMouseUp={stopDrawing}
                                    onMouseOut={stopDrawing}
                                    onMouseMove={draw}
                                    onTouchStart={startDrawing}
                                    onTouchEnd={stopDrawing}
                                    onTouchCancel={stopDrawing}
                                    onTouchMove={draw}
                                    width={600}
                                    height={300}
                                    style={{ width: '100%', height: '100%' }}
                                />
                            </>
                        )}
                    </div>

                    {/* Clear Button */}
                    <div className="flex justify-end">
                        <button onClick={clearSignature} className="flex items-center gap-1 text-[#2196f3] hover:text-[#1976d2] font-bold text-xs py-1 px-2 transition-colors">
                            <span className="material-symbols-outlined text-[16px]">ink_eraser</span>
                            Limpiar Firma
                        </button>
                    </div>

                    <p className="text-[10px] text-slate-400 italic leading-snug px-1">
                        Al firmar, el cliente declara su conformidad con el trabajo realizado y los materiales descritos en este reporte técnico.
                    </p>
                </div>

                {/* Main Action Buttons */}
                <div className="space-y-3 pt-4">

                    {/* Hidden file input — opened programmatically */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleFotoUpload}
                    />

                    {/* Photo preview strip */}
                    {fotoPreviews.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-bold text-slate-700 pl-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px] text-orange-500">photo_library</span>
                                {fotoPreviews.length} foto{fotoPreviews.length !== 1 ? 's' : ''} adjunta{fotoPreviews.length !== 1 ? 's' : ''}
                                {fotos.length < fotoPreviews.length && (
                                    <span className="ml-1 text-[10px] text-blue-500 font-medium animate-pulse">(subiendo...)</span>
                                )}
                            </p>
                            <div className="flex gap-2 overflow-x-auto pb-1">
                                {fotoPreviews.map((src, i) => (
                                    <div key={i} className="relative shrink-0">
                                        <img
                                            src={src}
                                            alt={`Foto ${i + 1}`}
                                            className={`w-20 h-20 object-cover rounded-xl border-2 ${i < fotos.length ? 'border-green-400' : 'border-blue-300 opacity-60'}`}
                                        />
                                        {i >= fotos.length && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-blue-500 animate-spin text-[20px]">refresh</span>
                                            </div>
                                        )}
                                        {i < fotos.length && (
                                            <span className="absolute top-1 right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                                <span className="material-symbols-outlined text-white text-[10px]">check</span>
                                            </span>
                                        )}
                                        {/* Delete button */}
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteFoto(i)}
                                            className="absolute top-0.5 left-0.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-md active:scale-90 transition-all"
                                            title="Borrar foto"
                                        >
                                            <span className="material-symbols-outlined text-white text-[12px]">close</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingFoto}
                        className="w-full bg-[#ff7b1c] text-white font-bold text-sm py-4 rounded-xl shadow-md shadow-orange-500/20 flex justify-center items-center gap-2 active:scale-95 transition-all disabled:opacity-60"
                    >
                        {uploadingFoto ? (
                            <><span className="material-symbols-outlined text-[20px] animate-spin">refresh</span> Comprimiendo y subiendo...</>
                        ) : (
                            <><span className="material-symbols-outlined text-[20px]">photo_camera</span>
                            {fotoPreviews.length > 0 ? 'AÑADIR MÁS FOTOS' : 'AGREGAR FOTOS'}</>
                        )}
                    </button>
                    
                    <button 
                        onClick={handleComplete}
                        disabled={submitting || uploadingFoto}
                        className="w-full bg-[#1b84ff] text-white font-bold text-sm py-4 rounded-xl shadow-md shadow-blue-500/30 flex justify-center items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {submitting ? (
                            <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
                        ) : (
                            <span className="material-symbols-outlined text-[20px]">inventory</span>
                        )}
                        AGREGAR REPORTE
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MobileDetalleOrden;
