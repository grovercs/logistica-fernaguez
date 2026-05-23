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
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [compacting, setCompacting] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [backingUpMedia, setBackingUpMedia] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false); // Mono-state for all Drive actions
  const [showConfig, setShowConfig] = useState(false);
  
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
      const { data: o } = await supabase.from('ordenes').select('id, id_legible, cliente, estado').in('estado', ['Finalizada', 'Finalizado']).eq('compactado', false);
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
      if (!window.confirm(`¿Compactar ${stats.prepared} obras?`)) return;
      setCompacting(true);
      try { await supabase.from('ordenes').update({ estado: 'Archivado', compactado: true }).in('id', compactables.map(c => c.id)); fetchStats(); } catch(e){} finally { setCompacting(false); }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 h-full relative overflow-hidden">
      
      {/* Config Modal - Scaled for Better Fit */}
      {showConfig && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6 transition-all duration-300">
              <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[40px] shadow-2xl border border-slate-200 dark:border-slate-800 p-8 space-y-6">
                  <div className="flex justify-between items-center pb-6 border-b dark:border-slate-800">
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter text-blue-600">Enlace Drive</h3>
                        <p className="text-[9px] font-black text-slate-400 tracking-[0.2em] uppercase mt-1">Nivel Administrador</p>
                    </div>
                    <button onClick={() => setShowConfig(false)} className="size-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-md font-bold text-xl hover:rotate-90 transition-all">×</button>
                  </div>
                  <div className="space-y-6">
                      <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-4">Google Client ID</label>
                          <input type="text" value={driveConfig.clientId} onChange={e => setDriveConfig({...driveConfig, clientId: e.target.value.trim()})} placeholder="..." className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-3xl text-xs font-bold shadow-inner outline-none transition-all" />
                      </div>
                      <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-4">Enlace de Carpeta</label>
                          <input type="text" value={driveConfig.folderId} onChange={e => setDriveConfig({...driveConfig, folderId: e.target.value})} placeholder="Pegue la URL completa..." className="w-full px-6 py-4 bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-amber-500 rounded-3xl text-xs font-bold shadow-inner outline-none transition-all" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <button onClick={() => requestAction('FOLDER')} className="py-4 bg-slate-900 text-white dark:bg-white dark:text-slate-950 rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:-translate-y-1 transition-all">CREAR CARPETA</button>
                          <button onClick={handleSaveConfig} className="py-4 bg-blue-600 text-white rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:-translate-y-1 transition-all">GUARDAR TODO</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Header - Harmonized size */}
      <header className="h-20 shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-10 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-6">
             <div className="size-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/10 shadow-inner"><span className="material-symbols-outlined text-3xl">database</span></div>
             <h2 className="text-3xl font-black uppercase tracking-tighter">Gestión de Datos</h2>
        </div>
        <div className="flex items-center gap-3">
             <span className="px-5 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-[10px] font-black uppercase tracking-widest border border-green-100 dark:border-green-800 rounded-full flex items-center gap-3 shadow-sm">
                 <span className="size-2 bg-green-500 rounded-full animate-pulse"></span> SISTEMA OK
             </span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto w-full">
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-10 pt-6 sticky top-0 z-40">
          <nav className="flex space-x-12">
            {[
                {id: 'backup', label: 'Protección', icon: 'shield_lock'},
                {id: 'restaurar', label: 'Rescate', icon: 'medical_services'},
                {id: 'compactar', label: 'Optimizar', icon: 'cleaning_services'},
                {id: 'archivados', label: 'Historial', icon: 'inventory_2'}
            ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`pb-6 border-b-8 font-black text-[10px] uppercase tracking-[0.3em] transition-all flex items-center gap-4 ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                    <span className="material-symbols-outlined text-2xl">{tab.icon}</span> {tab.label}
                </button>
            ))}
          </nav>
        </div>

        <div className="p-10 max-w-[1400px] mx-auto w-full pb-40">
            {activeTab === 'backup' && (
                <div className="space-y-12 animate-in fade-in duration-700">
                    <div className="flex flex-col lg:flex-row justify-between items-center gap-8 bg-white dark:bg-slate-900 p-12 rounded-[48px] border shadow-xl relative overflow-hidden group">
                        <div className="relative z-10 max-w-2xl">
                             <h2 className="text-5xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none mb-3">Seguridad Maestro</h2>
                             <p className="text-slate-500 font-bold text-xl leading-relaxed italic opacity-80">Blindaje operativo de activos digitales frente a cualquier amenaza.</p>
                        </div>
                        <button onClick={() => setShowConfig(true)} className="relative z-10 px-8 py-5 bg-slate-950 dark:bg-white dark:text-slate-950 text-white rounded-3xl font-black text-[10px] uppercase tracking-widest flex items-center gap-4 transition-all hover:scale-105 shadow-xl">
                             <span className="material-symbols-outlined text-xl">settings_suggestions</span> CONFIGURACIÓN DRIVE
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {/* Cloud Pill - Scaled */}
                        <div className="bg-white dark:bg-slate-900 rounded-[48px] border-2 border-slate-100 dark:border-slate-800 p-10 shadow-xl flex flex-col justify-between min-h-[500px] relative overflow-hidden group">
                            <div className="space-y-10 relative z-10">
                                <div className="flex justify-between items-start">
                                    <div className="size-20 bg-blue-600 rounded-[28px] flex items-center justify-center text-white shadow-lg"><span className="material-symbols-outlined text-5xl">cloud</span></div>
                                    <div className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border ${driveConfig.clientId ? 'bg-green-500 text-white border-green-400' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>{driveConfig.clientId ? 'ACTIVO' : 'PENDIENTE'}</div>
                                </div>
                                <div className="space-y-4">
                                     <h3 className="text-4xl font-black uppercase tracking-tighter leading-none">NUBE<br />ESTRUCTURAL</h3>
                                     <p className="text-slate-400 font-bold text-lg">Sincroniza la lógica del sistema (JSON) en la nube.</p>
                                </div>
                            </div>
                            <button onClick={() => requestAction('DATA')} disabled={isSyncing} className={`w-full py-6 rounded-3xl font-black text-[10px] uppercase tracking-widest transition-all ${isSyncing ? 'bg-slate-100 text-slate-300' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-600/20'}`}>
                                {isSyncing ? 'PROCESANDO...' : 'SINCRONIZAR YA'}
                            </button>
                        </div>

                        {/* Local JSON - Scaled */}
                        <div className="bg-white dark:bg-slate-900 rounded-[48px] border-2 p-10 shadow-xl flex flex-col justify-between min-h-[500px] hover:border-primary transition-all group">
                            <div className="space-y-10">
                                <div className="size-20 bg-primary/10 rounded-[28px] flex items-center justify-center text-primary shadow-inner border border-primary/10"><span className="material-symbols-outlined text-5xl">database</span></div>
                                <div className="space-y-4">
                                     <h3 className="text-4xl font-black uppercase tracking-tighter leading-none">COPIA<br />MANUAL</h3>
                                     <p className="text-slate-400 font-bold text-lg">Download .JSON del sistema para almacenamiento físico externo.</p>
                                </div>
                                <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[30px] font-black text-5xl text-primary flex items-end gap-3 border border-slate-100">
                                    {stats.size} <span className="text-[9px] uppercase text-slate-400 mb-2 tracking-widest leading-none">DATS</span>
                                </div>
                            </div>
                            <button onClick={handleBackup} disabled={backingUp} className="w-full py-6 bg-primary text-white rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:-translate-y-1 active:scale-95 transition-all">
                                {backingUp ? 'CREANDO...' : 'BAJAR JSON'}
                            </button>
                        </div>

                        {/* ZIP Multimedia - Scaled with Progress */}
                        <div className="bg-slate-950 rounded-[48px] p-10 shadow-xl flex flex-col justify-between min-h-[500px] border-4 border-slate-900 relative overflow-hidden group">
                             <div className="space-y-8 relative z-10">
                                <div className="size-20 bg-white/5 rounded-[28px] flex items-center justify-center text-white border border-white/10"><span className="material-symbols-outlined text-5xl">folder_zip</span></div>
                                <div className="space-y-3">
                                     <h3 className="text-4xl font-black uppercase tracking-tighter leading-none text-white whitespace-pre-line">ARCHIVO{"\n"}MULTIMEDIA</h3>
                                     <p className="text-slate-500 font-bold text-lg leading-relaxed italic opacity-80">Blindaje de fotos y firmas ante ciberataques.</p>
                                </div>
                                {(backingUpMedia || isSyncing) && pendingActionRef.current === 'MEDIA' ? (
                                    <div className="p-6 bg-white/5 rounded-3xl border border-white/10 space-y-4 animate-in slide-in-from-top-4">
                                         <div className="flex justify-between items-end">
                                             <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest leading-none">{mediaProgress.status}</p>
                                             <p className="text-2xl font-black text-white leading-none">{mediaProgress.percentage}%</p>
                                         </div>
                                         <div className="h-3 bg-white/10 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                             <div className="h-full bg-blue-600 rounded-full transition-all duration-300 shadow-[0_0_15px_rgba(37,99,235,0.7)]" style={{width: `${mediaProgress.percentage}%`}}></div>
                                         </div>
                                         <p className="text-[8px] font-black text-rose-500 uppercase tracking-[0.2em] text-center animate-pulse tracking-widest">⚠ NO CIERRE LA VENTANA</p>
                                    </div>
                                ) : (
                                     <div className="p-8 bg-white/5 rounded-[30px] font-black text-5xl text-white flex items-end gap-3 border border-white/5 shadow-inner">
                                        {stats.totalImages} <span className="text-[9px] uppercase text-slate-600 mb-2 tracking-widest leading-none">EVDS</span>
                                     </div>
                                )}
                            </div>
                            <div className="space-y-3 relative z-10 mt-6">
                                <button onClick={() => requestAction('MEDIA')} disabled={isSyncing || backingUpMedia} className={`w-full py-5 text-white rounded-3xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${isSyncing && pendingActionRef.current === 'MEDIA' ? 'bg-blue-900' : 'bg-blue-600 hover:bg-blue-700 shadow-xl'}`}>
                                    <span className="material-symbols-outlined text-lg">cloud_upload</span> 
                                    {isSyncing && pendingActionRef.current === 'MEDIA' ? 'SUBIENDO...' : 'SUBIR FOTOS A DRIVE'}
                                </button>
                                <button onClick={handleMediaBackup} disabled={backingUpMedia || isSyncing} className={`w-full py-5 rounded-3xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${backingUpMedia ? 'bg-slate-800 text-slate-500' : 'bg-white text-slate-950 shadow-lg'}`}>
                                     <span className="material-symbols-outlined text-lg">download</span>
                                     {backingUpMedia ? 'PREPARANDO...' : 'BAJAR ZIP LOCAL'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'restaurar' && (
                <div className="animate-in slide-in-from-bottom-10 space-y-12">
                    <div className="p-16 bg-rose-600 rounded-[48px] text-white shadow-xl relative overflow-hidden border-8 border-rose-500/50">
                        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-10 text-center lg:text-left">
                             <span className="material-symbols-outlined text-[120px] opacity-25">medical_services</span>
                             <div className="space-y-4">
                                <h2 className="text-5xl font-black uppercase tracking-tighter leading-none">Rescate Crítico</h2>
                                <p className="text-rose-100 font-bold text-xl leading-relaxed italic">Restauración de infraestructura en caso de incidencia operacional severa.</p>
                             </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-center">
                        <div className="bg-white dark:bg-slate-900 border-4 border-dashed border-slate-100 dark:border-slate-800 p-12 rounded-[48px] space-y-6 hover:border-primary transition-all group shadow-sm" onClick={handleRestore}>
                            <h4 className="text-3xl font-black uppercase tracking-tighter">Inyectar JSON</h4>
                            <p className="text-slate-400 font-bold text-lg leading-relaxed">Repone la estructura de datos administrativa.</p>
                            <button className="w-full py-5 bg-slate-50 text-slate-300 rounded-3xl font-black uppercase text-[10px] tracking-widest cursor-not-allowed">REQUIERE PERMISO</button>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border-4 border-dashed border-slate-100 dark:border-slate-800 p-12 rounded-[48px] space-y-6 hover:border-slate-950 transition-all group shadow-sm" onClick={handleRestore}>
                            <h4 className="text-3xl font-black uppercase tracking-tighter">Vincular ZIP</h4>
                            <p className="text-slate-400 font-bold text-lg leading-relaxed">Reconstituye la galería completa de evidencias.</p>
                            <button className="w-full py-5 bg-slate-50 text-slate-300 rounded-3xl font-black uppercase text-[10px] tracking-widest cursor-not-allowed">REQUIERE PERMISO</button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'compactar' && (
                <div className="animate-in slide-in-from-bottom-10 space-y-10">
                    <div className="p-12 bg-amber-500 rounded-[48px] text-slate-950 shadow-xl">
                        <h2 className="text-5xl font-black uppercase tracking-tighter mb-2">Optimización</h2>
                        <p className="text-amber-900 font-bold text-xl leading-relaxed italic opacity-70">Mantenimiento masivo para máxima velocidad de respuesta operativa.</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-10 rounded-[48px] shadow-xl border border-slate-100">
                        <div className="flex flex-col lg:flex-row items-center gap-10 text-center lg:text-left">
                            <div className="size-40 bg-amber-50 rounded-[35px] flex items-center justify-center text-amber-500 shadow-inner"><span className="material-symbols-outlined text-[70px]">cleaning_services</span></div>
                            <div className="flex-1 space-y-3">
                                <h3 className="text-3xl font-black uppercase tracking-tighter">Obras por Archivar</h3>
                                <p className="text-slate-500 font-bold text-lg leading-relaxed">Hay **{stats.prepared} registros** finalizados pendientes de compactación.</p>
                            </div>
                            <button onClick={handleCompactar} disabled={compacting || stats.prepared === 0} className="px-12 py-6 bg-amber-500 text-slate-950 rounded-[30px] font-black text-lg uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale">
                                {compacting ? 'ARCHIVANDO...' : 'EJECUTAR OPTIMIZACIÓN'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'archivados' && (
                <div className="animate-in slide-in-from-bottom-10 space-y-10">
                     <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <h2 className="text-5xl font-black uppercase tracking-tighter">Archivo Maestro</h2>
                        <input type="text" placeholder="BUSCAR EN HISTORIAL..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="px-8 py-5 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-full text-[10px] font-black shadow-lg outline-none focus:border-primary w-full md:w-[400px] transition-all" />
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-40">
                        {loading && <div className="col-span-full py-10 text-center text-xl font-black uppercase opacity-20 tracking-widest">ACCEDIENDO AL ARCHIVO...</div>}
                        {!loading && archivados.filter(a => (a.id_legible?.includes(searchTerm) || a.cliente?.toLowerCase().includes(searchTerm.toLowerCase()))).map(a => (
                            <div key={a.id} className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border-b-8 border-slate-100 dark:border-slate-800 hover:border-primary transition-all shadow-lg group">
                                <p className="text-[9px] font-black text-slate-400 mb-2 uppercase tracking-widest italic">{a.creado_en?.split('T')[0]}</p>
                                <h4 className="text-2xl font-black uppercase tracking-tighter mb-4 leading-tight">{a.id_legible}</h4>
                                <p className="text-slate-400 font-bold text-[10px] truncate mb-6">{a.cliente || 'Sin Cliente'}</p>
                                <button className="w-full py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] group-hover:bg-primary group-hover:text-white transition-all shadow-sm">DETALLE REGISTRO</button>
                            </div>
                        ))}
                     </div>
                </div>
            )}
        </div>
      </div>

      {/* Modern Status Hub - Scaled Down */}
      <div className="fixed bottom-10 right-10 p-6 bg-slate-950 text-white rounded-[40px] shadow-2xl border-2 border-white/10 flex items-center gap-8 z-[60] animate-in slide-in-from-right-40">
           <div className="size-14 bg-white/5 rounded-[20px] flex items-center justify-center text-primary shadow-lg border border-white/10"><span className="material-symbols-outlined text-2xl">hub</span></div>
           <div className="flex gap-10">
                <div className="pr-10 border-r-2 border-white/10">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Local Files</p>
                    <p className="text-lg font-black uppercase tracking-tighter">{stats.totalImages} Evidencias</p>
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Drive Link</p>
                    <p className={`text-lg font-black uppercase tracking-tighter flex items-center gap-3 ${driveConfig.clientId ? 'text-green-400' : 'text-amber-500'}`}>
                        {driveConfig.clientId ? 'OK' : 'FAIL'}
                        <span className="size-2 bg-current rounded-full animate-pulse"></span>
                    </p>
                </div>
           </div>
      </div>
    </div>
  );
}
