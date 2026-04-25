import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import JSZip from 'jszip';

interface OrdenEntry {
  id: string;
  id_legible: string;
  cliente: string;
  aseguradora: string;
  poliza: string;
  estado: string;
  creado_en: string;
  compactado: boolean;
}

interface DriveConfig {
  clientId: string;
  clientSecret: string;
  folderId: string;
  active: boolean;
}

type GisAction = 'NONE' | 'FOLDER' | 'DATA' | 'MEDIA';

export default function Bd() {
  const [activeTab, setActiveTab] = useState<'compactar' | 'backup' | 'restaurar' | 'archivados'>('backup');
  const [archivados, setArchivados] = useState<OrdenEntry[]>([]);
  const [compactables, setCompactables] = useState<OrdenEntry[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [compacting, setCompacting] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [backingUpMedia, setBackingUpMedia] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false); 
  const [showConfig, setShowConfig] = useState(false);
  const [selectedDetalle, setSelectedDetalle] = useState<any>(null);
  const [detallesLoading, setDetallesLoading] = useState(false);
  
  const [driveConfig, setDriveConfig] = useState<DriveConfig>(() => {
    const saved = localStorage.getItem('fernaguez_drive_config');
    return saved ? JSON.parse(saved) : { clientId: '', clientSecret: '', folderId: '', active: false };
  });

  const [mediaProgress, setMediaProgress] = useState({ current: 0, total: 0, percentage: 0, status: 'Esperando...' });
  const [stats, setStats] = useState({ prepared: 0, interventions: 0, size: '0 MB', totalImages: 0 });

  const tokenClientRef = useRef<any>(null);
  const pendingActionRef = useRef<GisAction>('NONE');

  useEffect(() => {
    fetchStats();
    if (activeTab === 'archivados') fetchArchivados();
    loadGoogleScripts();
  }, [activeTab]);

  const loadGoogleScripts = () => {
    const script = document.createElement('script');
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true; script.defer = true;
    script.onload = () => { if (driveConfig.clientId) initTokenClient(); };
    document.body.appendChild(script);
  };

  const initTokenClient = () => {
    if ((window as any).google) {
        tokenClientRef.current = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: driveConfig.clientId,
            scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly',
            callback: (response: any) => {
                if (response.access_token) {
                    const action = pendingActionRef.current;
                    if (action === 'FOLDER') performCreateFolder(response.access_token);
                    else if (action === 'MEDIA') performUploadZipToDrive(response.access_token);
                    else if (action === 'DATA') performActualCloudSync(response.access_token);
                } else {
                    setIsSyncing(false);
                }
            },
        });
    }
  };

  const fetchStats = async () => {
    try {
      const { data: o } = await supabase.from('ordenes').select('id, id_legible, cliente, estado, creado_en').in('estado', ['Finalizada', 'Finalizado']).eq('compactado', false);
      const { data: r } = await supabase.from('reportes').select('id, fotos_urls, firma_url');
      if (o && r) {
        setCompactables(o as any);
        let imgCount = 0;
        r.forEach(x => { if (x.fotos_urls) imgCount += x.fotos_urls.length; if (x.firma_url) imgCount += 1; });
        setStats({ prepared: o.length, interventions: r.length, size: `${(o.length * 0.15).toFixed(1)} MB`, totalImages: imgCount });
      }
    } catch (e) {}
  };

  const fetchArchivados = async () => {
     setLoading(true);
     const { data } = await supabase.from('ordenes').select('*').eq('estado', 'Archivado').order('creado_en', { ascending: false });
     if (data) setArchivados(data);
     setLoading(false);
  };

  const extractFolderId = (input: string) => {
      if (!input) return "";
      const match = input.match(/[-\w]{25,}/);
      return match ? match[0] : input.trim();
  };

  const handleSaveConfig = () => {
    const finalId = extractFolderId(driveConfig.folderId);
    const safeConfig = { ...driveConfig, folderId: finalId };
    setDriveConfig(safeConfig);
    localStorage.setItem('fernaguez_drive_config', JSON.stringify(safeConfig));
    setShowConfig(false); 
    initTokenClient();
    alert('✅ Ajustes guardados.');
  };

  const handleBackup = async () => {
      setBackingUp(true);
      try {
          const { data: o } = await supabase.from('ordenes').select('*');
          const { data: r } = await supabase.from('reportes').select('*');
          const content = JSON.stringify({ ts: new Date().toISOString(), o, r });
          const blob = new Blob([content], { type: 'application/json' });
          const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `backup_maestro_${Date.now()}.json`; link.click();
      } catch (e) {} finally { setBackingUp(false); }
  };

  const generateZipBlob = async (isCloud: boolean) => {
    setMediaProgress({ current: 0, total: 0, percentage: 0, status: 'Empaquetando...' });
    const { data } = await supabase.from('reportes').select('id, fotos_urls, firma_url');
    if (!data) throw new Error("Sin datos");
    
    const zip = new JSZip(); const fotos = zip.folder("evidencias");
    const total = data.length;
    for (let i = 0; i < total; i++) {
        const r = data[i];
        if (r.fotos_urls) {
            for (let j = 0; j < r.fotos_urls.length; j++) {
                try {
                    const res = await fetch(r.fotos_urls[j]);
                    fotos?.file(`R${r.id}_IMG${j}.jpg`, await res.blob());
                } catch (e) {}
            }
        }
        setMediaProgress({ current: i + 1, total, percentage: Math.round(((i + 1) / total) * 100), status: isCloud ? 'Enviando a Drive...' : 'Creando ZIP local...' });
    }
    return await zip.generateAsync({ type: "blob" });
  };

  const handleMediaBackup = async () => {
      setBackingUpMedia(true);
      try {
          const blob = await generateZipBlob(false);
          const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `fotos_logistica_${Date.now()}.zip`; link.click();
      } catch (e) {} finally { setBackingUpMedia(false); }
  };

  const requestAction = (action: GisAction) => {
      if (!driveConfig.clientId) return setShowConfig(true);
      pendingActionRef.current = action;
      if (!tokenClientRef.current) initTokenClient();
      setIsSyncing(true);
      tokenClientRef.current?.requestAccessToken();
  };

  const performUploadZipToDrive = async (token: string) => {
    try {
        const blob = await generateZipBlob(true);
        const filename = `GALERIA_AUTO_${Date.now()}.zip`;
        const finalFolderId = extractFolderId(driveConfig.folderId);
        setMediaProgress(p => ({ ...p, status: 'SUBIENDO ZIP PESADO. No cierre.' }));

        const boundary = '-------FERNAGUEZ_DELIM';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const metadata = { name: filename, mimeType: 'application/zip', parents: (finalFolderId && finalFolderId.length > 20) ? [finalFolderId] : [] };

        const reader = new FileReader();
        reader.onload = async () => {
            const body = new Blob([
                delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) + delimiter,
                'Content-Type: application/zip\r\n\r\n',
                reader.result as ArrayBuffer,
                "\r\n--" + boundary + "--"
            ]);
            const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
                body: body
            });
            if (res.ok) alert('🚀 GALERIA SUBIDA.'); else alert('Error subida.');
            setIsSyncing(false);
        };
        reader.readAsArrayBuffer(blob);
    } catch (e) { alert('Error.'); setIsSyncing(false); }
  };

  const performCreateFolder = async (token: string) => {
      try {
          const res = await fetch('https://www.googleapis.com/drive/v3/files', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: 'Logistica_Fernaguez_Respaldo', mimeType: 'application/vnd.google-apps.folder' })
          });
          const d = await res.json();
          if (res.ok) {
              setDriveConfig(prev => ({ ...prev, folderId: d.id }));
              localStorage.setItem('fernaguez_drive_config', JSON.stringify({ ...driveConfig, folderId: d.id }));
              alert('✅ Carpeta Creada.');
          } else alert('Error: ' + d.error.message);
      } catch (e) { alert('Error.'); } finally { setIsSyncing(false); }
  };

  const performActualCloudSync = async (token: string) => {
      try {
          const { data: o } = await supabase.from('ordenes').select('*');
          const { data: r } = await supabase.from('reportes').select('*');
          const content = JSON.stringify({ ts: new Date().toISOString(), data: { o, r } });
          const filename = `backup_datos_${Date.now()}.json`;
          const finalFolderId = extractFolderId(driveConfig.folderId);
          const boundary = '-------DATOS_DELIM';
          const delimiter = "\r\n--" + boundary + "\r\n";
          const metadata = { name: filename, mimeType: 'application/json', parents: (finalFolderId && finalFolderId.length > 20) ? [finalFolderId] : [] };
          const body = delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) + delimiter + 'Content-Type: application/json\r\n\r\n' + content + "\r\n--" + boundary + "--";

          const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
              body: body
          });
          if (res.ok) alert('🚀 DATOS (JSON) SUBIDOS'); else alert('Falla sync.');
      } catch (e) { alert('Error.'); } finally { setIsSyncing(false); }
  };

  const handleCompactar = async () => {
      if (selectedIds.size === 0) return alert('Seleccione al menos una obra para archivar.');
      if (!window.confirm(`¿Confirmar archivado de ${selectedIds.size} obras seleccionadas?`)) return;
      
      setCompacting(true);
      try { 
          const idsToArchive = Array.from(selectedIds);
          const { error } = await supabase
            .from('ordenes')
            .update({ estado: 'Archivado', compactado: true })
            .in('id', idsToArchive);
          
          if (error) throw error;
          
          setSelectedIds(new Set());
          fetchStats(); 
          alert(`✅ ${idsToArchive.length} obras movidas al historial.`);
      } catch(e: any) {
          alert('Error al archivar: ' + e.message);
      } finally { 
          setCompacting(false); 
      }
  };

  const toggleAll = () => {
    if (selectedIds.size === compactables.length) {
        setSelectedIds(new Set());
    } else {
        setSelectedIds(new Set(compactables.map(c => c.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleRestaurar = async (id: string) => {
    if (!window.confirm('¿Desea restaurar esta obra al sistema activo? Volverá a aparecer en el Calendario y Listado de Órdenes.')) return;
    
    setLoading(true);
    try {
        const { error } = await supabase
            .from('ordenes')
            .update({ estado: 'Finalizada', compactado: false })
            .eq('id', id);
        
        if (error) throw error;
        
        alert('✅ Obra restaurada correctamente.');
        setSelectedDetalle(null); // Close modal if open
        fetchArchivados();
        fetchStats();
    } catch (e: any) {
        alert('Error al restaurar: ' + e.message);
    } finally {
        setLoading(false);
    }
  };

  const handleVerDetalle = async (id: string) => {
    setDetallesLoading(true);
    try {
        // 1. Get the order first to ensure we have its ID and ID Legible
        const { data: orden, error: ordenError } = await supabase.from('ordenes').select('*').eq('id', id).single();
        if (ordenError) throw ordenError;

        // 2. Try fetching reports by the UUID (orden_id)
        let { data: reportes, error: repError } = await supabase
            .from('reportes')
            .select('*')
            .eq('orden_id', id);
        
        // 3. Fallback: If 0 reports found by UUID, try by id_legible just in case of legacy data
        if (!repError && (!reportes || reportes.length === 0)) {
            const { data: fallbackRep } = await supabase
                .from('reportes')
                .select('*')
                .eq('orden_id', orden.id_legible);
            if (fallbackRep && fallbackRep.length > 0) reportes = fallbackRep;
        }

        // 4. Manual Join with Perfiles (since automatic join might fail due to FK introspection)
        if (reportes && reportes.length > 0) {
            const { data: perfiles } = await supabase.from('perfiles').select('id, nombre_completo');
            const perfMap: any = {};
            perfiles?.forEach(p => perfMap[p.id] = p.nombre_completo);
            
            reportes = reportes.map(r => ({
                ...r,
                perfiles: { nombre_completo: perfMap[r.tecnico_id] || 'Técnico Externo' }
            }));

            // Sort by fecha_trabajo or creado_en
            reportes.sort((a,b) => new Date(b.fecha_trabajo || b.creado_en).getTime() - new Date(a.fecha_trabajo || a.creado_en).getTime());
        }
        
        if (orden) {
            setSelectedDetalle({ ...orden, reportes: reportes || [] });
        }
    } catch (e: any) {
        alert('Error al cargar detalles: ' + e.message);
    } finally {
        setDetallesLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 h-full relative overflow-hidden">
      
      {/* Config Modal - Standard UI */}
      {showConfig && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
              <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b dark:border-slate-800">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Ajustes de Google Drive</h3>
                    <button onClick={() => setShowConfig(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                  <div className="space-y-4">
                      <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-500">Google Client ID</label>
                          <input type="text" value={driveConfig.clientId} onChange={e => setDriveConfig({...driveConfig, clientId: e.target.value.trim()})} placeholder="Ingrese su Client ID" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all" />
                      </div>
                      <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-500">URL o ID de Carpeta</label>
                          <input type="text" value={driveConfig.folderId} onChange={e => setDriveConfig({...driveConfig, folderId: e.target.value})} placeholder="Pegue la URL completa..." className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all" />
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2">
                          <button onClick={() => requestAction('FOLDER')} className="py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg font-bold text-xs hover:bg-slate-200 transition-all">CREAR CARPETA</button>
                          <button onClick={handleSaveConfig} className="py-2 bg-primary text-white rounded-lg font-bold text-xs hover:bg-primary/90 transition-all shadow-md">GUARDAR TODO</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Header - Harmonized with Dashboard.tsx */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 w-full backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-8 h-16">
          <div className="flex items-center gap-3">
               <div className="size-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary border border-primary/20"><span className="material-symbols-outlined text-xl">database</span></div>
               <h2 className="text-lg font-black tracking-tight">Base de Datos</h2>
          </div>
          <div className="flex items-center gap-2">
               <span className="hidden sm:flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-800 rounded-full">
                   <span className="size-1.5 bg-emerald-500 rounded-full animate-pulse"></span> SISTEMA ACTIVO
               </span>
               <span className="sm:hidden size-3 bg-emerald-500 rounded-full animate-pulse border-2 border-white dark:border-slate-900 shadow-sm"></span>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto w-full">
        {/* Navigation - Standard Tabs */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-8">
            <nav className="flex space-x-6 sm:space-x-8 overflow-x-auto no-scrollbar scroll-smooth">
              {[
                  {id: 'backup', label: 'Protección', icon: 'shield_lock'},
                  {id: 'restaurar', label: 'Rescate', icon: 'medical_services'},
                  {id: 'compactar', label: 'Optimizar', icon: 'cleaning_services'},
                  {id: 'archivados', label: 'Historial', icon: 'inventory_2'}
              ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`py-4 border-b-2 font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shrink-0 ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                      <span className="material-symbols-outlined text-lg">{tab.icon}</span> {tab.label}
                  </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
            {activeTab === 'backup' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    {/* Hero replaced with compact summary */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="space-y-1">
                             <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Seguridad y Respaldo de Datos</h2>
                             <p className="text-sm text-slate-500 dark:text-slate-400 italic leading-relaxed">Blindaje operativo de activos digitales frente a cualquier amenaza.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setShowConfig(true)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-slate-200 transition-all border border-slate-200 dark:border-slate-700">
                                <span className="material-symbols-outlined text-lg">settings</span> CONFIGURAR DRIVE
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Cloud Action Card */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between min-h-[340px] group transition-all hover:shadow-md">
                            <div className="space-y-6">
                                <div className="flex justify-between items-start">
                                    <div className="size-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600"><span className="material-symbols-outlined text-3xl">cloud</span></div>
                                    <div className={`px-3 py-1 rounded-lg text-[10px] font-bold border ${driveConfig.clientId ? 'bg-green-50 text-green-600 border-green-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>{driveConfig.clientId ? 'CONECTADO' : 'PENDIENTE'}</div>
                                </div>
                                <div className="space-y-2">
                                     <h3 className="text-lg font-bold">Respaldo en Nube</h3>
                                     <p className="text-sm text-slate-500 leading-relaxed">Sincroniza la estructura de la base de datos (JSON) en su cuenta de Google Drive.</p>
                                </div>
                            </div>
                            <button onClick={() => requestAction('DATA')} disabled={isSyncing} className={`w-full py-3 rounded-lg font-bold text-sm transition-all ${isSyncing ? 'bg-slate-100 text-slate-300' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/10 active:scale-95'}`}>
                                {isSyncing ? 'PROCESANDO...' : 'SINCRONIZAR AHORA'}
                            </button>
                        </div>

                        {/* Local JSON Action Card */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between min-h-[340px] group transition-all hover:shadow-md">
                            <div className="space-y-6">
                                <div className="size-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary"><span className="material-symbols-outlined text-3xl">database</span></div>
                                <div className="space-y-2">
                                     <h3 className="text-lg font-bold">Descarga Manual</h3>
                                     <p className="text-sm text-slate-500 leading-relaxed">Obtenga una copia física del sistema para almacenamiento externo offline.</p>
                                </div>
                                <div className="inline-flex items-center gap-2 text-primary font-bold text-3xl">
                                    {stats.size} <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Aprox.</span>
                                </div>
                            </div>
                            <button onClick={handleBackup} disabled={backingUp} className="w-full py-3 bg-primary text-white rounded-lg font-bold text-sm hover:bg-primary/90 transition-all shadow-md shadow-primary/10 active:scale-95">
                                {backingUp ? 'CREANDO...' : 'DESCARGAR JSON'}
                            </button>
                        </div>

                        {/* ZIP Multimedia Action Card */}
                        <div className="bg-slate-900 rounded-xl p-6 shadow-sm flex flex-col justify-between min-h-[340px] relative overflow-hidden group">
                             <div className="space-y-6 relative z-10">
                                <div className="size-12 bg-white/10 rounded-lg flex items-center justify-center text-white"><span className="material-symbols-outlined text-3xl">folder_zip</span></div>
                                <div className="space-y-2">
                                     <h3 className="text-lg font-bold text-white">Galería Multimedia</h3>
                                     <p className="text-slate-400 text-sm leading-relaxed">Archivo comprimido de todas las evidencias táctiles y fotográficas.</p>
                                </div>
                                {(backingUpMedia || isSyncing) && pendingActionRef.current === 'MEDIA' ? (
                                    <div className="p-4 bg-white/10 rounded-lg border border-white/5 space-y-3 animate-in slide-in-from-top-4">
                                         <div className="flex justify-between items-center">
                                             <p className="text-[10px] font-bold text-blue-400 uppercase">{mediaProgress.status}</p>
                                             <p className="text-lg font-bold text-white">{mediaProgress.percentage}%</p>
                                         </div>
                                         <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                             <div className="h-full bg-blue-500 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{width: `${mediaProgress.percentage}%`}}></div>
                                         </div>
                                         <p className="text-[9px] font-bold text-rose-400 uppercase text-center animate-pulse">NO CIERRE LA VENTANA</p>
                                    </div>
                                ) : (
                                     <div className="inline-flex items-center gap-2 text-white font-bold text-3xl">
                                        {stats.totalImages} <span className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">Evidencias</span>
                                     </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-3 relative z-10 mt-6">
                                <button onClick={() => requestAction('MEDIA')} disabled={isSyncing || backingUpMedia} className={`py-2 px-2 text-white rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all ${isSyncing && pendingActionRef.current === 'MEDIA' ? 'bg-blue-900 shadow-none' : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20'}`}>
                                    ☁ DRIVE
                                </button>
                                <button onClick={handleMediaBackup} disabled={backingUpMedia || isSyncing} className={`py-2 px-2 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all ${backingUpMedia ? 'bg-slate-800 text-slate-500 shadow-none' : 'bg-white text-slate-900 hover:bg-slate-100 shadow-lg'}`}>
                                    📁 ZIP LOCAL
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats Integrated */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex justify-around shadow-sm text-center">
                        <div>
                             <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Obras</p>
                             <p className="text-xl font-bold">{compactables.length + archivados.length}</p>
                        </div>
                        <div className="w-px h-10 bg-slate-100 dark:bg-slate-800 self-center"></div>
                        <div>
                             <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Pend. Optimización</p>
                             <p className="text-xl font-bold text-amber-500">{stats.prepared}</p>
                        </div>
                        <div className="w-px h-10 bg-slate-100 dark:bg-slate-800 self-center"></div>
                        <div>
                             <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Conexión Drive</p>
                             <p className={`text-xl font-bold ${driveConfig.clientId ? 'text-green-500' : 'text-slate-300'}`}>{driveConfig.clientId ? 'ACTIVA' : 'INACTIVA'}</p>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'restaurar' && (
                <div className="animate-in slide-in-from-bottom-5 space-y-8">
                    <div className="p-8 bg-rose-600 rounded-xl text-white shadow-lg flex items-center gap-8">
                         <div className="size-16 bg-white/20 rounded-lg flex items-center justify-center text-white"><span className="material-symbols-outlined text-4xl">medical_services</span></div>
                         <div className="space-y-1">
                            <h2 className="text-2xl font-bold">Estrategia de Rescate</h2>
                            <p className="text-rose-100 text-sm font-medium leading-relaxed opacity-80">Restauración de infraestructura en caso de incidencia operacional severa.</p>
                         </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-center">
                        <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 p-8 rounded-xl space-y-4 hover:border-primary transition-all group">
                            <h4 className="text-lg font-bold uppercase tracking-tight">Vincular Archivo Maestro</h4>
                            <p className="text-slate-500 text-sm leading-relaxed">Repone la estructura de datos administrativa (.JSON).</p>
                            <button className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-lg text-xs font-bold cursor-not-allowed">PROTEGIDO POR ADMIN</button>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 p-8 rounded-xl space-y-4 hover:border-slate-950 transition-all group">
                            <h4 className="text-lg font-bold uppercase tracking-tight">Cargar Galería ZIP</h4>
                            <p className="text-slate-500 text-sm leading-relaxed">Reconstituye el carrete multimedia global (.ZIP).</p>
                            <button className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-lg text-xs font-bold cursor-not-allowed">PROTEGIDO POR ADMIN</button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'compactar' && (
                <div className="animate-in slide-in-from-bottom-5 space-y-8">
                    <div className="p-8 bg-amber-500 rounded-xl text-slate-950 shadow-md flex items-center gap-8">
                        <div className="size-16 bg-white/20 rounded-lg flex items-center justify-center text-slate-950"><span className="material-symbols-outlined text-4xl">cleaning_services</span></div>
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold">Optimización de Registros</h2>
                            <p className="text-amber-950 text-sm font-medium leading-relaxed opacity-70">Seleccione las obras finalizadas que desea mover al historial administrativo.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                             <div className="flex items-center gap-4">
                                <h3 className="text-lg font-bold">Órdenes Finalizadas</h3>
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-lg uppercase">{compactables.length} DISPONIBLES</span>
                             </div>
                             <div className="flex items-center gap-3">
                                <button onClick={toggleAll} className="text-xs font-bold text-slate-500 hover:text-primary transition-colors">
                                    {selectedIds.size === compactables.length ? 'DESELECCIONAR TODO' : 'SELECCIONAR TODO'}
                                </button>
                                <button 
                                    onClick={handleCompactar} 
                                    disabled={compacting || selectedIds.size === 0} 
                                    className="px-6 py-2 bg-amber-500 text-slate-950 rounded-lg font-bold text-xs shadow-md hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-lg">inventory_2</span>
                                    {compacting ? 'ARCHIVANDO...' : `ARCHIVAR ${selectedIds.size} SELECCIONADAS`}
                                </button>
                             </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto text-sm">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-medium border-b border-slate-200 dark:border-slate-800">
                                        <tr>
                                            <th className="px-6 py-3 w-10">
                                                <input type="checkbox" checked={selectedIds.size === compactables.length && compactables.length > 0} onChange={toggleAll} className="size-4 rounded border-slate-300 text-primary focus:ring-primary/50" />
                                            </th>
                                            <th className="px-4 py-3">Fecha</th>
                                            <th className="px-4 py-3">ID OT</th>
                                            <th className="px-4 py-3">Cliente</th>
                                            <th className="px-4 py-3">Aseguradora</th>
                                            <th className="px-4 py-3 text-right">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                                        {compactables.length === 0 ? (
                                            <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-400 italic">No hay órdenes finalizadas pendientes de optimización.</td></tr>
                                        ) : compactables.map(a => (
                                            <tr key={a.id} onClick={() => toggleOne(a.id)} className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer ${selectedIds.has(a.id) ? 'bg-primary/5 dark:bg-primary/10' : ''}`}>
                                                <td className="px-6 py-4">
                                                    <input type="checkbox" checked={selectedIds.has(a.id)} onChange={() => {}} className="size-4 rounded border-slate-300 text-primary focus:ring-primary/50" />
                                                </td>
                                                <td className="px-4 py-4 text-slate-400 text-xs">{a.creado_en?.split('T')[0]}</td>
                                                <td className="px-4 py-4 font-bold text-slate-900 dark:text-white uppercase">{a.id_legible}</td>
                                                <td className="px-4 py-4 text-slate-500">{a.cliente || 'Sin Cliente'}</td>
                                                <td className="px-4 py-4 text-slate-400 text-xs uppercase font-bold">{a.aseguradora}</td>
                                                <td className="px-4 py-4 text-right">
                                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/20 text-[10px] font-bold rounded uppercase">{a.estado}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400 italic text-center">Optimizar registros ayuda a mantener la rapidez del sistema al mover datos operativos pesados al historial administrativo.</p>
                    </div>
                </div>
            )}

            {activeTab === 'archivados' && (
                <div className="animate-in slide-in-from-bottom-5 space-y-6">
                     <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <h2 className="text-lg font-bold">Historial Maestro</h2>
                        <div className="relative w-full md:w-80">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                            <input type="text" placeholder="Buscar por ID o cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/50 placeholder:text-slate-500 outline-none transition-all shadow-sm" />
                        </div>
                     </div>
                     <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto text-sm">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-medium border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        <th className="px-6 py-3">Fecha</th>
                                        <th className="px-6 py-3">ID OT</th>
                                        <th className="px-6 py-3">Cliente</th>
                                        <th className="px-6 py-3 text-right">Información</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                                    {loading ? (
                                        <tr><td colSpan={4} className="px-6 py-20 text-center text-slate-400 font-medium uppercase tracking-[0.2em]">Cargando archivo histórico...</td></tr>
                                    ) : archivados.length === 0 ? (
                                        <tr><td colSpan={4} className="px-6 py-20 text-center text-slate-400">Sin registros archivados.</td></tr>
                                    ) : archivados.filter(a => (a.id_legible?.includes(searchTerm) || a.cliente?.toLowerCase().includes(searchTerm.toLowerCase()))).map(a => (
                                        <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                            <td className="px-6 py-4 text-slate-400 text-xs">{a.creado_en?.split('T')[0]}</td>
                                            <td className="px-6 py-4 font-bold text-slate-900 dark:text-white uppercase">{a.id_legible}</td>
                                            <td className="px-6 py-4 text-slate-500">{a.cliente || 'Sin Cliente'}</td>
                                            <td className="px-6 py-4 text-right flex items-center justify-end gap-2 text-[10px] font-bold">
                                                <button onClick={() => handleVerDetalle(a.id)} className="text-primary bg-primary/5 dark:bg-primary/20 hover:bg-primary/10 px-2 py-1 rounded-lg border border-primary/10 transition-all uppercase flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-sm">visibility</span> VER DETALLE
                                                </button>
                                                <button onClick={() => handleRestaurar(a.id)} className="text-amber-600 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100/50 px-2 py-1 rounded-lg border border-amber-100 dark:border-amber-800 transition-all uppercase flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-sm">settings_backup_restore</span> RESTAURAR
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                     </div>
                </div>
            )}
        </div>
      </div>
      {/* Detail Modal */}
      {selectedDetalle && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
              <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh]">
                  <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 rounded-t-xl">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">inventory_2</span>
                            Resumen de Obra Histórica
                        </h3>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{selectedDetalle.id_legible}</p>
                      </div>
                      <button onClick={() => setSelectedDetalle(null)} className="size-8 flex items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 transition-all">
                          <span className="material-symbols-outlined">close</span>
                      </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-8 space-y-8">
                      {/* Section 1: Data */}
                      <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-4">
                              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b pb-1">Información del Cliente</h4>
                              <div className="space-y-2">
                                  <p className="text-sm font-bold">{selectedDetalle.cliente || 'Sin nombre'}</p>
                                  <p className="text-xs text-slate-500">{selectedDetalle.direccion || 'Sin dirección registrada'}</p>
                                  <p className="text-xs text-slate-500">CP: {selectedDetalle.codigo_postal || '---'} | {selectedDetalle.localidad || '---'}</p>
                              </div>
                          </div>
                          <div className="space-y-4">
                              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b pb-1">Datos Operativos</h4>
                              <div className="space-y-2">
                                  <div className="flex justify-between text-xs"><span className="text-slate-400">Aseguradora:</span> <span className="font-bold">{selectedDetalle.aseguradora}</span></div>
                                  <div className="flex justify-between text-xs"><span className="text-slate-400">Póliza:</span> <span className="font-bold">{selectedDetalle.poliza}</span></div>
                                  <div className="flex justify-between text-xs"><span className="text-slate-400">Creada el:</span> <span className="font-bold">{selectedDetalle.creado_en?.split('T')[0]}</span></div>
                              </div>
                          </div>
                      </div>

                      {/* Section 2: Intervention History */}
                      <div className="space-y-4">
                          <div className="flex justify-between items-center border-b pb-1">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Intervenciones Realizadas</h4>
                                <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    {selectedDetalle.reportes?.length || 0} Reportes
                                </span>
                          </div>
                          <div className="space-y-3">
                              {selectedDetalle.reportes?.length === 0 ? (
                                  <div className="p-8 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
                                      <span className="material-symbols-outlined text-3xl text-slate-300">history_toggle_off</span>
                                      <p className="text-xs text-slate-400 italic">No se encontraron reportes registrados para esta obra.</p>
                                      <p className="text-[9px] text-slate-400">Las obras archivadas conservan sus datos íntegros.</p>
                                  </div>
                              ) : selectedDetalle.reportes.map((r: any) => (
                                  <div key={r.id} className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-100 dark:border-slate-800 flex justify-between items-center group hover:border-primary/30 transition-all">
                                      <div className="space-y-1">
                                          <div className="flex items-center gap-2">
                                              <span className="size-2 bg-primary rounded-full"></span>
                                              <p className="text-xs font-bold text-slate-900 dark:text-white">{new Date(r.fecha_trabajo).toLocaleDateString()}</p>
                                          </div>
                                          <p className="text-[10px] text-slate-500 ml-4 italic line-clamp-1">{r.trabajos_realizados || 'Sin descripción técnica'}</p>
                                      </div>
                                      <div className="text-right">
                                          <p className="text-[10px] font-bold text-primary uppercase">{r.perfiles?.nombre_completo || 'Técnico Externo'}</p>
                                          <p className="text-[9px] text-slate-400">Ref: {r.id.substring(0,8)}</p>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>

                  <div className="p-6 border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl flex justify-between items-center">
                    <p className="text-[10px] text-slate-400 max-w-[250px]">Esta obra se encuentra archivada. Al restaurar, se habilitarán de nuevo todas las opciones de edición e impresión.</p>
                    <button onClick={() => handleRestaurar(selectedDetalle.id)} className="px-6 py-2 bg-amber-500 text-slate-950 rounded-lg font-bold text-xs shadow-md hover:bg-amber-600 transition-all flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">settings_backup_restore</span> 
                        RESTAURAR AHORA
                    </button>
                  </div>
              </div>
          </div>
      )}

      {/* Loading Overlay for details */}
      {detallesLoading && (
          <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-[1px] z-[110] flex items-center justify-center">
              <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
      )}
    </div>
  );
}
