import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { compressImage } from '../../lib/compressImage';
import { uploadToCloudinary } from '../../lib/cloudinary';
// Cloudinary integration for image uploads

const MobileDetalleOrden = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const [orden, setOrden] = useState<any>(null);
    const [reportes, setReportes] = useState<any[]>([]); // List of all reports
    const [reporte, setReporte] = useState<any>(null); // Current report being edited
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [currentUserName, setCurrentUserName] = useState<string>('');
    const [currentUserRole, setCurrentUserRole] = useState<string>('');
    const [trabajadoresMap, setTrabajadoresMap] = useState<Map<string, { nombre: string; especialidad: string }>>(new Map());

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
    const [showForm, setShowForm] = useState(false); // Modal control
    const [viewingReport, setViewingReport] = useState<any>(null); // Report being viewed (read-only)

    useEffect(() => {
        if (showForm) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [showForm]);

    useEffect(() => {
        if (id) {
            fetchOrden();
            // Store this as the last active order
            localStorage.setItem('last_active_order', id);
        }
    }, [id]);

    const fetchOrden = async () => {
        // Get the current logged-in user
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id || null;
        setCurrentUserId(userId);

        if (!userId) return;

        // Get User Profile and Role
        const { data: profile } = await supabase
            .from('perfiles')
            .select('nombre_completo, roles(nombre)')
            .eq('id', userId)
            .maybeSingle();

        const roleName = (profile?.roles as any)?.nombre || 'Trabajador';
        setCurrentUserRole(roleName);
        setCurrentUserName(profile?.nombre_completo || userData?.user?.email?.split('@')[0] || 'Trabajador');

        const [ordenReq, reportesReq, trabajadoresReq] = await Promise.all([
            supabase.from('ordenes').select('*').eq('id', id).single(),
            // Todos los trabajadores ven TODAS las intervenciones de la orden
            supabase.from('reportes').select('*').eq('orden_id', id).order('creado_en', { ascending: false }),
            // Fetch all workers to map IDs to names and specialties
            supabase.from('trabajadores').select('auth_user_id, nombre, apellidos, especialidad')
        ]);

        if (ordenReq.error) {
            console.error('Error fetching orden:', ordenReq.error);
        }

        if (reportesReq.error) {
            console.error('Error fetching reportes:', reportesReq.error);
        }

        if (trabajadoresReq.error) {
            console.error('Error fetching trabajadores:', trabajadoresReq.error);
        }

        // Create map of technician IDs to names and specialties
        if (!trabajadoresReq.error && trabajadoresReq.data) {
            const map = new Map<string, { nombre: string; especialidad: string }>();
            trabajadoresReq.data.forEach((t: any) => {
                if (t.auth_user_id && t.nombre) {
                    map.set(t.auth_user_id, {
                        nombre: `${t.nombre} ${t.apellidos || ''}`.trim(),
                        especialidad: t.especialidad || ''
                    });
                }
            });
            setTrabajadoresMap(map);
        }

        if (!ordenReq.error && ordenReq.data) {
            setOrden(ordenReq.data);
            if (ordenReq.data.creado_en) {
                setFecha(new Date(ordenReq.data.creado_en).toISOString().split('T')[0]);
            }
        }

        if (!reportesReq.error && reportesReq.data) {
            setReportes(reportesReq.data);
        } else {
            // Fallback: try without any join
            const { data: fallbackReportes } = await supabase
                .from('reportes')
                .select('*')
                .eq('orden_id', id)
                .order('creado_en', { ascending: false });
            if (fallbackReportes) {
                setReportes(fallbackReportes);
            }
        }
        setLoading(false);
    };

    const handleDeleteReport = async (reportId: string) => {
        if (currentUserRole !== 'Administrador') return;
        if (!window.confirm('¿Estás seguro de que deseas eliminar este reporte técnico? Esta acción no se puede deshacer.')) return;

        setLoading(true);
        const { error } = await supabase.from('reportes').delete().eq('id', reportId);
        
        if (error) {
            alert('Error al eliminar el reporte: ' + error.message);
        } else {
            alert('Reporte eliminado correctamente.');
            fetchOrden();
        }
        setLoading(false);
    };

    const resetForm = () => {
        setReporte(null);
        setTrabajoRealizado('');
        setMaterialUtilizado('');
        setFotos([]);
        setFotoPreviews([]);
        setFacturas([]);
        setFacturaPreviews([]);
        setHasSignature(false);
        setSelectedHora(0);
        setSelectedMinuto(0);
        
        // Reset canvas
        const ctx = canvasRef.current?.getContext('2d');
        ctx?.clearRect(0, 0, canvasRef.current?.width || 0, canvasRef.current?.height || 0);

        // Reset date to today
        setFecha(new Date().toISOString().split('T')[0]);

        // Open Modal
        setShowForm(true);
    };

    const loadReportData = (rep: any) => {
        setReporte(rep);
        
        // Robust split: handles '\n\nMATERIALES:\n', '\nMATERIALES:\n', ' MATERIALES: ', etc.
        const notes = rep.notas || '';
        const splitter = /[ \t\n]*(?:MATERIALES:?)[ \t\n]*/i;
        const parts = notes.split(splitter);
        
        const descFallback = parts[0] || '';
        const matFallback = parts[1] || '';
        
        setTrabajoRealizado(rep.trabajo_realizado || descFallback.trim());
        setMaterialUtilizado(rep.material_utilizado || matFallback.trim());
        
        // Highly strict check to avoid false positives from 'null' strings or placeholders
        const isSigned = !!rep.firma_url && 
                         typeof rep.firma_url === 'string' && 
                         rep.firma_url.startsWith('http') && 
                         rep.firma_url.length > 50; 
        setHasSignature(isSigned);
        
        // Reset canvas before loading (it will show the image if firma_url exists)
        const ctx = canvasRef.current?.getContext('2d');
        ctx?.clearRect(0, 0, canvasRef.current?.width || 0, canvasRef.current?.height || 0);
        
        // Use fecha_trabajo if available, fallback to creado_en
        const reportDate = rep.fecha_trabajo || (rep.creado_en ? new Date(rep.creado_en).toISOString().split('T')[0] : '');
        setFecha(reportDate);
        
        // Load previously saved hours
        const totalHours = rep.horas_trabajadas || 0;
        setSelectedHora(Math.floor(totalHours));
        setSelectedMinuto(Math.round((totalHours % 1) * 60));

        // Restore previously uploaded photos and invoices
        setFotos(rep.fotos_urls || []);
        setFotoPreviews(rep.fotos_urls || []);
        setFacturas(rep.facturas_urls || []);
        setFacturaPreviews(rep.facturas_urls || []);
        
        // Open Modal
        setShowForm(true);
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

                // 2. Compress the image (max 1280px, JPEG 70%)
                const compressed = await compressImage(file);
                const sizeKB = Math.round(compressed.size / 1024);
                console.log(`Compressed ${file.name}: ${Math.round(file.size/1024)}KB → ${sizeKB}KB`);

                // 3. Generate descriptive filename: OB-2026-1234_2026-04-01_foto_1
                const ordenId = orden?.id_legible || id || 'unknown';
                const fecha = new Date().toISOString().split('T')[0];
                const count = fotos.length + newUrls.length + 1;
                const filename = `${ordenId}_${fecha}_foto_${count}`;

                // 4. Upload to Cloudinary
                const result = await uploadToCloudinary(compressed, 'logistica/visitas', filename);
                newUrls.push(result.secure_url);
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

        // Note: We don't delete from Cloudinary (requires backend/API secret)
        // Simply remove from local state - images remain in Cloudinary
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
                const compressed = await compressImage(file, 1600, 0.75); // Good quality for invoices

                // Generate descriptive filename: OB-2026-1234_2026-04-01_factura_1
                const ordenId = orden?.id_legible || id || 'unknown';
                const fecha = new Date().toISOString().split('T')[0];
                const count = facturas.length + newUrls.length + 1;
                const filename = `${ordenId}_${fecha}_factura_${count}`;

                const result = await uploadToCloudinary(compressed, 'logistica/facturas', filename);
                newUrls.push(result.secure_url);
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
        // Note: We don't delete from Cloudinary (requires backend/API secret)
        // Simply remove from local state
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
        }
    };

    const draw = (e: any) => {
        if (!isDrawing || !canvasRef.current) return;
        setHasSignature(true); // Only set to true when actual drawing/movement occurs
        
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
        if (!window.confirm('¿Estás seguro de que deseas borrar la firma actual? Deberás firmar de nuevo.')) return;
        
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
        
        let signatureUrl = reporte?.firma_url;

        // If the signature pad is empty/cleared, we MUST set signatureUrl to null
        if (!hasSignature) {
            signatureUrl = null;
        } 
        // If we have a new signature on canvas, upload it to Storage
        else if (canvasRef.current && (!reporte?.firma_url || canvasRef.current.toDataURL('image/png') !== reporte.firma_url)) {
            try {
                const blob = await new Promise<Blob>((resolve) => canvasRef.current!.toBlob((b) => resolve(b!), 'image/png'));
                const fileName = `firmas/${id}/${Date.now()}-firma.png`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('fotos-reportes')
                    .upload(fileName, blob, { contentType: 'image/png', upsert: true });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('fotos-reportes')
                    .getPublicUrl(uploadData.path);
                
                signatureUrl = publicUrl;
            } catch (err) {
                console.error('Error uploading signature:', err);
                alert("Error al subir la firma al servidor.");
                setSubmitting(false);
                return;
            }
        }

        const parsedHoras = selectedHora + (selectedMinuto / 60);

        const reportData: any = {
            orden_id: id,
            // Preserve the original technician when editing
            tecnico_id: reporte?.tecnico_id || currentUserId,
            notas: `${trabajoRealizado}\n\nMATERIALES:\n${materialUtilizado}`,
            firma_url: signatureUrl,
            horas_trabajadas: parsedHoras,
            fotos_urls: fotos,
            creado_en: signatureUrl ? new Date().toISOString() : (reporte?.creado_en || new Date().toISOString()),
            // The following fields require the database migration
            trabajo_realizado: trabajoRealizado,
            material_utilizado: materialUtilizado,
            facturas_urls: facturas,
            fecha_trabajo: fecha || new Date().toISOString().split('T')[0],
        };

        const saveReport = async (data: any) => {
            if (reporte?.id) {
                return await supabase.from('reportes').update(data).eq('id', reporte.id);
            } else {
                return await supabase.from('reportes').insert(data);
            }
        };

        let errorReporte = null;

        // Attempt 1: Full save with all columns
        const { error: errFull } = await saveReport(reportData);
        
        // Attempt 2: Fallback if columns are missing (error 42703 is Undefined Column in PG)
        if (errFull && (errFull.code === '42703' || errFull.message?.includes('column'))) {
            console.warn('Fallback save: Missing specialized columns. Run migration for full support.');
            const fallbackData = {
                orden_id: id,
                tecnico_id: currentUserId,
                notas: reportData.notas,
                firma_url: reportData.firma_url,
                horas_trabajadas: reportData.horas_trabajadas,
                fotos_urls: reportData.fotos_urls,
                creado_en: reportData.creado_en
            };
            const { error: errFallback } = await saveReport(fallbackData);
            errorReporte = errFallback;
        } else {
            errorReporte = errFull;
        }

        if (errorReporte) {
            console.error(errorReporte);
            alert("Error al guardar el reporte técnico.");
            setSubmitting(false);
            return;
        }
        
        // AUTOMATION:
        // 1. If there is a signature, set to 'En revisión'
        // 2. If no signature but was 'Pendiente', set to 'En Curso'
        const newEstado = signatureUrl ? 'En revisión' : 'En Curso';
        
        await supabase
            .from('ordenes')
            .update({ 
                estado: newEstado,
            })
            .eq('id', id);

        setSubmitting(false);
        alert("¡Reporte guardado correctamente!");
        setShowForm(false); // Close Modal on success
        fetchOrden(); // Refresh list
        localStorage.setItem('last_active_order', id || '');
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

            {/* DATOS DE LA ORDEN (HEADER) */}
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

                  {/* INTERVENCIONES PREVIAS (HISTORIAL) */}
                  <div className="pt-5 border-t border-slate-200">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                           <span className="material-symbols-outlined text-[18px]">history</span>
                           Intervenciones Realizadas ({reportes.length})
                        </h3>
                        <button 
                            onClick={resetForm}
                            className="bg-primary hover:bg-primary/90 text-white text-[11px] font-black px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm active:scale-95 transition-all"
                        >
                            <span className="material-symbols-outlined text-[16px]">add</span>
                            NUEVA
                        </button>
                      </div>

                      {reportes.length === 0 ? (
                        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 text-center">
                            <p className="text-xs text-slate-400 font-medium italic">No hay intervenciones registradas aún.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                            {reportes.map((rep, idx) => {
                                const canEdit = currentUserRole === 'Administrador' || currentUserRole === 'Editor' || rep.tecnico_id === currentUserId;
                                const canDelete = currentUserRole === 'Administrador';
                                // Get technician info from the map, fallback to 'Técnico'
                                const tecnicoInfo = trabajadoresMap.get(rep.tecnico_id);
                                const tecnicoName = tecnicoInfo?.nombre || 'Técnico';

                                return (
                                    <div
                                        key={rep.id}
                                        className={`p-3 rounded-xl border transition-all relative ${reporte?.id === rep.id ? 'bg-primary/5 border-primary shadow-sm ring-1 ring-primary/20' : 'bg-slate-50 border-slate-100'}`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-slate-400 uppercase">PARTE #{reportes.length - idx}</span>
                                                <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[12px]">person</span>
                                                    {tecnicoName}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] font-bold text-slate-500 bg-slate-200/50 px-1.5 py-0.5 rounded uppercase">
                                                    {new Date(rep.fecha_trabajo || rep.creado_en).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                                </span>
                                                {canDelete && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteReport(rep.id); }}
                                                        className="w-7 h-7 flex items-center justify-center text-red-400 hover:text-red-600 active:scale-90 transition-all"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="mt-1">
                                            <p className="text-xs font-bold text-slate-800 line-clamp-2">
                                                {(rep.notas || '').split(/[ \t\n]*(?:MATERIALES:?)[ \t\n]*/i)[0] || <span className="italic text-slate-400 font-normal">(Sin descripción)</span>}
                                            </p>
                                            <div className="mt-2 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    {rep.horas_trabajadas > 0 && (
                                                        <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-[12px]">schedule</span> {rep.horas_trabajadas}h
                                                        </span>
                                                    )}
                                                    {(rep.firma_url && typeof rep.firma_url === 'string' && rep.firma_url.startsWith('http') && rep.firma_url.length > 50) && (
                                                        <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-[14px]">verified</span> FIRMADO
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-2 mt-3">
                                                <button
                                                    onClick={() => setViewingReport(rep)}
                                                    className="flex-1 bg-primary/10 text-primary text-[10px] font-black py-2 rounded-lg hover:bg-primary/20 active:scale-95 transition-all"
                                                >
                                                    VER DETALLE
                                                </button>
                                                {canEdit && (
                                                    <button
                                                        onClick={() => loadReportData(rep)}
                                                        className="flex-1 bg-primary text-white text-[10px] font-black py-2 rounded-lg hover:bg-primary/90 active:scale-95 transition-all"
                                                    >
                                                        EDITAR
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                      )}
                  </div>
            </div>

            {/* MODAL / BOTTOM SHEET PARA EL FORMULARIO */}
            {showForm && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        onClick={() => !submitting && setShowForm(false)}
                    />

                    {/* Modal Content (Bottom Sheet on mobile) */}
                    <div className="relative w-full max-w-2xl bg-[#f0f2f5] rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full duration-300 max-h-[95vh] flex flex-col">
                        
                        {/* Modal Header */}
                        <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-slate-100 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${reporte?.id ? 'bg-primary text-white shadow-md' : 'bg-primary/10 text-primary'}`}>
                                    <span className="material-symbols-outlined text-[20px]">{reporte?.id ? 'edit_note' : 'add_notes'}</span>
                                </div>
                                <h2 className="text-lg font-black text-slate-800 tracking-tight">
                                    {reporte?.id ? 'Editar Reporte' : 'Nueva Intervención'}
                                </h2>
                            </div>
                            <button 
                                onClick={() => !submitting && setShowForm(false)}
                                className="text-slate-400 hover:text-slate-600 active:scale-95 transition-all p-1"
                            >
                                <span className="material-symbols-outlined text-[28px]">close</span>
                            </button>
                        </div>

                        {/* Modal Body (Scrollable) */}
                        <div className="overflow-y-auto p-6 pb-24 space-y-6">
                            {reporte && (
                                <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-sm flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-[20px]">edit_square</span>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black uppercase leading-none">MODO EDICIÓN</span>
                                            <span className="text-[10px] opacity-90">Parte de {new Date(reporte.creado_en).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={resetForm}
                                        className="bg-white/20 text-white text-[10px] font-bold px-2 py-1 rounded-lg border border-white/20 hover:bg-white/30"
                                    >
                                        CAMBIAR A NUEVA
                                    </button>
                                </div>
                            )}

                            {/* Motivo de la orden (para referencia) */}
                            <div className="pt-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight flex justify-between items-center mb-2">
                                    Motivo de la Orden 
                                    <span className="text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-black">POL: {orden?.poliza || '-'}</span>
                                </p>
                                <p className="text-xs text-slate-600 leading-relaxed bg-white/50 p-4 rounded-2xl border border-white shadow-inner italic">
                                    {orden?.descripcion || 'Sin descripción detallada'}
                                </p>
                            </div>
                <div className="space-y-4 pt-4">
                    <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1">Información de esta Intervención</h2>
                    
                    {/* Fecha */}
                    <div>
                        <label className="block text-xs font-bold text-slate-800 mb-2 pl-1">Fecha de trabajo</label>
                        <div className="relative">
                            <input 
                                type="date"
                                className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-4 pr-10 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm appearance-none"
                                value={fecha}
                                onChange={e => setFecha(e.target.value)}
                            />
                            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none select-none text-[20px]">calendar_today</span>
                        </div>
                    </div>

                    {/* Horas y Minutos */}
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                             <label className="block text-xs font-bold text-slate-800 mb-2 pl-1">Horas dedicadas</label>
                             <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-between px-4 py-3">
                                <button 
                                    type="button"
                                    onClick={() => setSelectedHora(Math.max(0, selectedHora - 1))}
                                    className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-200 active:scale-95 transition-all font-bold text-lg"
                                >
                                    −
                                </button>
                                <span className="text-2xl font-black text-primary">{selectedHora.toString().padStart(2, '0')}</span>
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
                                <span className="text-2xl font-black text-primary">{selectedMinuto.toString().padStart(2, '0')}</span>
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

                    {/* Técnico (read-only) */}
                    <div>
                        <label className="block text-xs font-bold text-slate-800 mb-2 pl-1">Técnico asignado</label>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary text-[20px]">engineering</span>
                            <span className="text-sm font-bold text-slate-800">{currentUserName}</span>
                        </div>
                    </div>
                </div>

                {/* DETALLES DEL REPORTE */}
                <div className="space-y-4 pt-2">
                    <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1">Detalles del Reporte</h2>
                    
                    {/* Trabajo Realizado */}
                    <div>
                        <label className="block text-xs font-bold text-slate-800 mb-2 pl-1">Descripción del Trabajo</label>
                        <textarea 
                            rows={3}
                            placeholder="Describa qué se ha hecho en esta visita..."
                            className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm resize-none"
                            value={trabajoRealizado}
                            onChange={(e) => setTrabajoRealizado(e.target.value)}
                        />
                    </div>

                    {/* Material Utilizado */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold text-slate-800 pl-1">Material y Gastos</label>
                            <button
                                type="button"
                                onClick={() => facturaInputRef.current?.click()}
                                disabled={uploadingFactura}
                                className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg active:scale-95 transition-all disabled:opacity-50"
                            >
                                {uploadingFactura
                                    ? <><span className="material-symbols-outlined text-[14px] animate-spin">refresh</span> Subiendo...</>
                                    : <><span className="material-symbols-outlined text-[14px]">receipt_long</span> Foto Factura/Gasto</>}
                            </button>
                        </div>
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
                            placeholder="Materiales usados, repuestos, peajes, etc..."
                            className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm resize-none"
                            value={materialUtilizado}
                            onChange={(e) => setMaterialUtilizado(e.target.value)}
                        />
                        {/* Shorthand for previews */}
                        {facturaPreviews.length > 0 && (
                            <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
                                {facturaPreviews.map((src, i) => (
                                    <div key={i} className="relative shrink-0">
                                        <img src={src} alt="Factura" className="w-16 h-16 object-cover rounded-lg border border-amber-200" />
                                        <button onClick={() => handleDeleteFactura(i)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-[10px]">close</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* FIRMA DEL CLIENTE */}
                <div className="space-y-4 pt-2">
                    <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1">Conformidad (Firma)</h2>
                    <div className="bg-white border-2 border-dashed border-slate-300 rounded-xl overflow-hidden touch-none relative h-[180px]">
                        {reporte?.firma_url ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50">
                                <img src={reporte.firma_url} alt="Firma Guardada" className="h-full object-contain" />
                            </div>
                        ) : (
                            <>
                                {!hasSignature && (
                                    <span className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 font-sans text-sm select-none">
                                        Firmar aquí
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
                    <div className="flex justify-between items-center px-1">
                        <p className="text-[10px] text-slate-400 italic">Obligatorio para cerrar el parte</p>
                        <button onClick={clearSignature} className="flex items-center gap-1 text-primary font-bold text-xs">
                            <span className="material-symbols-outlined text-[14px]">ink_eraser</span>
                            Limpiar
                        </button>
                    </div>
                </div>

                {/* MAIN ACTIONS */}
                <div className="space-y-4 pt-6">
                    <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFotoUpload} />
                    
                    {fotoPreviews.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {fotoPreviews.map((src, i) => (
                                <div key={i} className="relative shrink-0">
                                    <img src={src} className="w-20 h-20 object-cover rounded-xl border-2 border-white shadow-sm" alt="Trabajo" />
                                    <button onClick={() => handleDeleteFoto(i)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center border-2 border-white shadow-sm">
                                        <span className="material-symbols-outlined text-[12px]">close</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingFoto}
                        className="w-full bg-[#ff7b1c] text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-500/20 active:scale-95 transition-all flex justify-center items-center gap-2"
                    >
                        <span className="material-symbols-outlined">photo_camera</span>
                        {uploadingFoto ? 'SUBIENDO...' : 'AÑADIR FOTOS DE LA VISITA'}
                    </button>

                    <button 
                        onClick={handleComplete}
                        disabled={submitting || uploadingFoto}
                        className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl active:scale-95 transition-all flex justify-center items-center gap-3 text-lg"
                    >
                        <span className="material-symbols-outlined">
                            {submitting ? 'sync' : (reporte?.id ? 'save' : 'done_all')}
                        </span>
                        {submitting ? 'GUARDANDO...' : (reporte?.id ? 'GUARDAR CAMBIOS' : 'AÑADIR INTERVENCIÓN')}
                    </button>
                    </div>
                </div>
            </div>
        </div>
        )}

        {/* MODAL DE VISUALIZACIÓN (SOLO LECTURA) */}
        {viewingReport && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    onClick={() => setViewingReport(null)}
                />

                {/* Modal Content */}
                <div className="relative w-full max-w-2xl bg-[#f0f2f5] rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full duration-300 max-h-[88vh] flex flex-col mt-8 sm:mt-0">

                    {/* Safe area spacing for mobile */}
                    <div className="h-2 sm:hidden"></div>

                    {/* Modal Header - Worker Info */}
                    <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-5 text-white shrink-0 rounded-t-[2.3rem]">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-2xl">person</span>
                                </div>
                                <div>
                                    <h2 className="text-lg font-black tracking-tight">
                                        {(() => {
                                            const info = trabajadoresMap.get(viewingReport.tecnico_id);
                                            return info?.nombre || 'Técnico';
                                        })()}
                                    </h2>
                                    <p className="text-sm text-white/80 font-medium uppercase">
                                        {(() => {
                                            const info = trabajadoresMap.get(viewingReport.tecnico_id);
                                            return info?.especialidad || 'Trabajador';
                                        })()}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setViewingReport(null)}
                                className="text-white/80 hover:text-white active:scale-95 transition-all p-1"
                            >
                                <span className="material-symbols-outlined text-[28px]">close</span>
                            </button>
                        </div>
                        <div className="mt-3 flex items-center gap-4 text-sm text-white/70">
                            <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                                {new Date(viewingReport.fecha_trabajo || viewingReport.creado_en).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </span>
                            {viewingReport.horas_trabajadas > 0 && (
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[16px]">schedule</span>
                                    {viewingReport.horas_trabajadas}h
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Modal Body */}
                    <div className="overflow-y-auto p-6 pb-32 space-y-6">

                        {/* Tiempo dedicado */}
                        {viewingReport.horas_trabajadas > 0 && (
                            <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-3">
                                <span className="material-symbols-outlined text-blue-600 text-2xl">schedule</span>
                                <div>
                                    <p className="text-[10px] font-bold text-blue-600 uppercase">Tiempo dedicado</p>
                                    <p className="text-lg font-black text-blue-800">{viewingReport.horas_trabajadas} horas</p>
                                </div>
                            </div>
                        )}

                        {/* Trabajo realizado */}
                        <div>
                            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2">Trabajo Realizado</h3>
                            <div className="bg-white rounded-xl p-4 border border-slate-200">
                                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                                    {viewingReport.trabajo_realizado || (viewingReport.notas || '').split(/[ \t\n]*(?:MATERIALES:?)[ \t\n]*/i)[0] || 'Sin descripción'}
                                </p>
                            </div>
                        </div>

                        {/* Materiales utilizados */}
                        {viewingReport.material_utilizado && (
                            <div>
                                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2">Materiales Utilizados</h3>
                                <div className="bg-white rounded-xl p-4 border border-slate-200">
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{viewingReport.material_utilizado}</p>
                                </div>
                            </div>
                        )}

                        {/* Fotos del trabajo */}
                        {viewingReport.fotos_urls && Array.isArray(viewingReport.fotos_urls) && viewingReport.fotos_urls.length > 0 && (
                            <div>
                                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2">
                                    Fotos del Trabajo ({viewingReport.fotos_urls.length})
                                </h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {viewingReport.fotos_urls.map((url: string, i: number) => (
                                        <a
                                            key={i}
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block aspect-square rounded-xl overflow-hidden border border-slate-200 bg-white"
                                        >
                                            <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Facturas */}
                        {viewingReport.facturas_urls && Array.isArray(viewingReport.facturas_urls) && viewingReport.facturas_urls.length > 0 && (
                            <div>
                                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2">
                                    Facturas/Recibos ({viewingReport.facturas_urls.length})
                                </h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {viewingReport.facturas_urls.map((url: string, i: number) => (
                                        <a
                                            key={i}
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block aspect-square rounded-xl overflow-hidden border border-amber-200 bg-white"
                                        >
                                            <img src={url} alt={`Factura ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Firma */}
                        {viewingReport.firma_url && typeof viewingReport.firma_url === 'string' && viewingReport.firma_url.startsWith('http') && (
                            <div>
                                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2">Firma del Cliente</h3>
                                <div className="bg-white rounded-xl p-4 border border-slate-200 flex justify-center">
                                    <img src={viewingReport.firma_url} alt="Firma" className="max-h-32 object-contain" />
                                </div>
                            </div>
                        )}

                        {/* Notas adicionales del notes field if different */}
                        {viewingReport.notas && !viewingReport.trabajo_realizado && (
                            <div>
                                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2">Notas</h3>
                                <div className="bg-slate-100 rounded-xl p-4">
                                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{viewingReport.notas}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bottom Action Button */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#f0f2f5] via-[#f0f2f5] to-transparent pt-8">
                        <button
                            onClick={() => {
                                setViewingReport(null);
                                resetForm();
                                setShowForm(true);
                            }}
                            className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-lg shadow-primary/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined">add_circle</span>
                            AÑADIR MI INTERVENCIÓN
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
);
};

export default MobileDetalleOrden;
