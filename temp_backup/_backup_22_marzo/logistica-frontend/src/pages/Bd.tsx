import { useState } from 'react';

export default function Bd() {
  const [activeTab, setActiveTab] = useState<'compactar' | 'backup' | 'restaurar' | 'archivados'>('backup');
  const [selectedArchivados, setSelectedArchivados] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const mockArchivados = [
    { id: 'OB-2023-089', cliente: 'Edificio Los Pinos', aseguradora: 'Mapfre', fecha: '12/10/2023', poliza: 'MPF-9921-A', estado: 'Finalizado' },
    { id: 'OB-2023-142', cliente: 'Juan de Dios', aseguradora: 'Allianz', fecha: '05/11/2023', poliza: 'ALZ-3342-X', estado: 'Finalizado' },
    { id: 'OB-2023-189', cliente: 'Comunidad El Rosal', aseguradora: 'Generali', fecha: '28/11/2023', poliza: 'GEN-2210-B', estado: 'Finalizado' },
    { id: 'OB-2023-205', cliente: 'Supermercado Central', aseguradora: 'Axa', fecha: '15/12/2023', poliza: 'AXA-9081-C', estado: 'Finalizado' },
    { id: 'OB-2024-012', cliente: 'Taller San José', aseguradora: 'Mapfre', fecha: '10/01/2024', poliza: 'MPF-0012-P', estado: 'Finalizado' },
  ];

  const filteredArchivados = mockArchivados.filter(item => 
    item.cliente.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.aseguradora.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.poliza.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelectAll = () => {
    if (selectedArchivados.length === filteredArchivados.length && filteredArchivados.length > 0) {
      setSelectedArchivados([]);
    } else {
      setSelectedArchivados(filteredArchivados.map(item => item.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedArchivados.includes(id)) {
      setSelectedArchivados(selectedArchivados.filter(item => item !== id));
    } else {
      setSelectedArchivados([...selectedArchivados, id]);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 h-full">
      {/* Header */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-8 flex items-center justify-between shrink-0 sticky top-0 z-10 w-full">
        <h2 className="text-xl font-bold tracking-tight">Gestión de Base de Datos</h2>
        <div className="flex items-center gap-4">
          <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full relative transition-colors">
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-2 right-2 size-2 bg-red-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
          </button>
          <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-2"></div>
          <div className="flex items-center gap-3 pl-2">
            <div className="text-right">
              <p className="text-xs font-bold">Admin Usuario</p>
              <p className="text-[10px] text-slate-500 font-medium">Administrador</p>
            </div>
            <img 
               className="size-10 rounded-full bg-slate-200 object-cover" 
               alt="User profile" 
               src="https://lh3.googleusercontent.com/aida-public/AB6AXuBH00mXjg6hMuGH_H3WM48ZkGeSf5qZCDbAYunKkRdHkaVOse-O6QCuhB-0pJF6nbR5bRmFgJjnCS2fep1rwts8trl2dM4M6rpfcUnny164iO2NsaaI39hDGvv9ESZbNElGirGf_-XjUsF4VrFYvSnTYJ6gEftlZ0C0F2x-2Gb6jqtCJX5SyZqoA0m0BoZmJshis_b5_xAjbON1eQUdTQrcci591-3OGLMFHLRQAT4mkZFqZI_DcFQgXKm7DvXkDfxVNL7CtjDlP1I"
            />
          </div>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto w-full flex flex-col">
        {/* Navigation Tabs */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 pt-4">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('backup')}
              className={`pb-4 px-1 border-b-2 font-bold text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
                activeTab === 'backup'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:hover:text-slate-300'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">cloud_sync</span>
              Copias de Seguridad
            </button>
            <button
              onClick={() => setActiveTab('restaurar')}
              className={`pb-4 px-1 border-b-2 font-bold text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
                activeTab === 'restaurar'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:hover:text-slate-300'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">restore</span>
              Restaurar Sistema
            </button>
            <button
              onClick={() => setActiveTab('compactar')}
              className={`pb-4 px-1 border-b-2 font-bold text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
                activeTab === 'compactar'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:hover:text-slate-300'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">folder_zip</span>
              Compactar BD
            </button>
            <button
              onClick={() => setActiveTab('archivados')}
              className={`pb-4 px-1 border-b-2 font-bold text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
                activeTab === 'archivados'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:hover:text-slate-300'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">inventory_2</span>
              Obras Archivadas
            </button>
          </nav>
        </div>

        <div className="p-8 max-w-7xl mx-auto w-full">
            {/* -------------------- TAB COMPACTAR -------------------- */}
            {activeTab === 'compactar' && (
                <div className="animate-in fade-in duration-300">
                    <div className="mb-8">
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Compactación y Archivo</h2>
                        <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
                            Esta herramienta archiva las intervenciones de obras finalizadas. Una vez compactadas, dejarán de aparecer en el calendario diario para mejorar el rendimiento del sistema de agentes móviles.
                        </p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-8 items-stretch mb-8">
                        <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                                <h3 className="font-bold">Resumen de Compactación</h3>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                <div className="flex justify-between items-center p-4">
                                    <span className="text-slate-500 dark:text-slate-400 font-medium text-sm">Obras preparadas</span>
                                    <span className="font-black text-lg">42</span>
                                </div>
                                <div className="flex justify-between items-center p-4">
                                    <span className="text-slate-500 dark:text-slate-400 font-medium text-sm">Intervenciones a archivar</span>
                                    <span className="font-black text-lg">156</span>
                                </div>
                                <div className="flex justify-between items-center p-4 bg-primary/5">
                                    <span className="text-primary font-bold text-sm">Espacio liberado estimado</span>
                                    <span className="font-black text-primary text-lg">24.5 MB</span>
                                </div>
                            </div>
                        </div>

                        <div className="w-full md:w-[400px] flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900 rounded-xl border border-rose-100 dark:border-rose-900/30 shadow-lg relative overflow-hidden text-center gap-5 shrink-0">
                            <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-900/20 flex items-center justify-center text-rose-500">
                                <span className="material-symbols-outlined text-3xl">warning</span>
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-xl font-black text-slate-900 dark:text-white">Proceso Crítico</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Por favor, no cierre esta página hasta finalizar.</p>
                            </div>
                            <button className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-black transition-all shadow-lg shadow-rose-500/30 hover:-translate-y-0.5 mt-2">
                                <span className="material-symbols-outlined text-xl">database_upload</span>
                                EJECUTAR COMPACTACIÓN
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* -------------------- TAB BACKUP -------------------- */}
            {activeTab === 'backup' && (
                <div className="animate-in fade-in duration-300">
                    <div className="mb-8">
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Copias de Seguridad (Google Drive)</h2>
                        <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
                            Configura y realiza copias de seguridad de las bases de datos enteras y adjuntos directamente a tu nube de Google Drive mediante la API.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Estado Conexión */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm relative overflow-hidden">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-500 shadow-inner">
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                                        <path d="M7.71 3.5L1.15 15l3.43 6 6.55-11.5M9.73 15L6.3 21h13.12l3.43-6M12 3.5L8.57 9.5h13.11L18.25 3.5"/>
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Conexión con Google Drive</h3>
                                    <p className="text-sm font-bold text-green-500 flex items-center gap-1 mt-1">
                                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                        Conectado activamente
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4 mb-8 border-t border-slate-100 dark:border-slate-800 pt-4">
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Cuenta Vinculada</p>
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">admin@logisticafernaguez.es</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Carpeta de Destino</p>
                                    <p className="text-sm font-semibold text-primary">/Backups Sistema LF</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Política de retención</p>
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Mantener últimos 30 días (Auto-borrado)</p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-sm transition-colors">
                                    Configuración
                                </button>
                                <button className="flex-1 px-4 py-2.5 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 font-bold rounded-lg text-sm transition-colors text-center">
                                    Desvincular Cuenta
                                </button>
                            </div>
                        </div>

                        {/* Control Backup */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-center items-center text-center">
                            <span className="material-symbols-outlined text-[64px] text-slate-200 dark:text-slate-700 mb-4">cloud_upload</span>
                            <h3 className="font-bold text-xl mb-2">Realizar Copia Manual</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
                                Ejecuta un respaldo instantáneo de la base de datos SQL y los archivos de firmas digitales actuales hacia tu cuenta de Google Drive sincronizada.
                            </p>
                            <button className="px-8 py-3.5 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all active:scale-95 flex items-center gap-2">
                                <span className="material-symbols-outlined">backup</span>
                                Crear Backup Ahora
                            </button>
                            <p className="text-xs font-bold text-slate-400 mt-4 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-full">
                                Próximo backup automático: Hoy, 23:59h
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                            <h3 className="font-bold text-sm">Historial Reciente (En Drive)</h3>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-500 p-2 rounded-lg">
                                            <span className="material-symbols-outlined text-[20px]">check_circle</span>
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm">Backup Automático v{i}</p>
                                            <p className="text-xs text-slate-500">Volcado SQL (14.2 MB) - Hace {i} días</p>
                                        </div>
                                    </div>
                                    <button className="text-primary hover:bg-primary/10 p-2 rounded-full transition-colors" title="Descargar registro localmente">
                                        <span className="material-symbols-outlined text-[20px]">download</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* -------------------- TAB RESTAURAR -------------------- */}
            {activeTab === 'restaurar' && (
                <div className="animate-in fade-in duration-300">
                     <div className="mb-8 border-l-4 border-rose-500 pl-4 py-2">
                        <h2 className="text-3xl font-black text-rose-600 dark:text-rose-500 tracking-tight">Zona de Restauración de Emergencia</h2>
                        <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
                            <strong>Advertencia severa:</strong> Restaurar la base de datos sobrescribirá permanentemente la información actual del sistema. Todos los cambios realizados después de la fecha y hora del archivo de respaldo seleccionado se perderán irreversiblemente.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         {/* Desde Drive */}
                         <div className="bg-white dark:bg-slate-900 rounded-xl border-2 border-slate-200 hover:border-primary dark:border-slate-800 dark:hover:border-primary transition-colors p-6 shadow-sm flex flex-col h-full cursor-pointer relative overflow-hidden group">
                             <div className="absolute top-0 right-0 p-4 opacity-50 text-slate-300 dark:text-slate-700 group-hover:text-primary transition-colors">
                                 <svg viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16">
                                        <path d="M7.71 3.5L1.15 15l3.43 6 6.55-11.5M9.73 15L6.3 21h13.12l3.43-6M12 3.5L8.57 9.5h13.11L18.25 3.5"/>
                                 </svg>
                             </div>
                             <span className="material-symbols-outlined text-[48px] text-primary mb-4 relative z-10">cloud_download</span>
                             <h3 className="font-bold text-lg mb-2 relative z-10">Restaurar desde Google Drive</h3>
                             <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 flex-1 relative z-10">
                                 Abre un buscador de los últimos volcados (backups) automáticos realizados en tu carpeta de Drive. Una vez seleccionado, el sistema lo descargará y lo aplicará.
                             </p>
                             <button className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold rounded-lg border border-slate-200 dark:border-slate-700 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all relative z-10">
                                 Explorar Nube
                             </button>
                         </div>

                         {/* Desde Local */}
                         <div className="bg-white dark:bg-slate-900 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400 p-6 shadow-sm flex flex-col h-full items-center justify-center text-center cursor-pointer transition-colors">
                             <span className="material-symbols-outlined text-[48px] text-slate-400 mb-4">upload_file</span>
                             <h3 className="font-bold text-lg mb-2">Restaurar archivo local (.sql)</h3>
                             <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mb-6 px-4">
                                 Arrastra aquí un archivo de copia de seguridad manualmente o pulsa para seleccionar el archivo desde tu ordenador.
                             </p>
                             <button className="px-6 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold text-sm border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                 Seleccionar Archivo
                             </button>
                         </div>
                    </div>
                </div>
            )}

            {/* -------------------- TAB ARCHIVADOS -------------------- */}
            {activeTab === 'archivados' && (
                <div className="animate-in fade-in duration-300 pb-24">
                    <div className="mb-8">
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Obras Archivadas</h2>
                        <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
                            Busca y recupera trabajos finalizados que han sido compactados previamente. Puedes seleccionarlos para restaurarlos al listado activo o exportar sus informes.
                        </p>
                    </div>

                    {/* Filtros */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm mb-6 flex flex-col md:flex-row items-center gap-4">
                        <div className="relative flex-1 w-full">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                            <input 
                                type="text"
                                placeholder="Buscar por cliente, póliza, ID o aseguradora..." 
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-shadow"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                            <select className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-300 outline-none w-full sm:w-auto">
                                <option value="">Todas Aseguradoras</option>
                                <option value="mapfre">Mapfre</option>
                                <option value="allianz">Allianz</option>
                                <option value="generali">Generali</option>
                                <option value="axa">Axa</option>
                            </select>
                            <input type="date" className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-300 outline-none w-full sm:w-auto" />
                        </div>
                    </div>

                    {/* Tabla de Resultados */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden mb-8 relative">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                        <th className="py-3 px-4 w-12 text-center">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/20 cursor-pointer"
                                                checked={selectedArchivados.length === filteredArchivados.length && filteredArchivados.length > 0}
                                                onChange={toggleSelectAll}
                                            />
                                        </th>
                                        <th className="py-3 px-4 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">ID Obra</th>
                                        <th className="py-3 px-4 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fecha Cierre</th>
                                        <th className="py-3 px-4 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cliente</th>
                                        <th className="py-3 px-4 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Aseguradora</th>
                                        <th className="py-3 px-4 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Póliza</th>
                                        <th className="py-3 px-4 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredArchivados.map((obra) => (
                                        <tr key={obra.id} className={`border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${selectedArchivados.includes(obra.id) ? 'bg-primary/5 dark:bg-primary/10' : ''}`}>
                                            <td className="py-3 px-4 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/20 cursor-pointer"
                                                    checked={selectedArchivados.includes(obra.id)}
                                                    onChange={() => toggleSelect(obra.id)}
                                                />
                                            </td>
                                            <td className="py-3 px-4 text-sm font-bold text-slate-900 dark:text-white">
                                                {obra.id}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400 font-medium">{obra.fecha}</td>
                                            <td className="py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">{obra.cliente}</td>
                                            <td className="py-3 px-4 text-sm font-bold text-primary">{obra.aseguradora}</td>
                                            <td className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400 font-mono">{obra.poliza}</td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                    obra.estado === 'Finalizado' 
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                                }`}>
                                                    {obra.estado}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredArchivados.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="py-12 text-center">
                                                <div className="inline-flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-2">
                                                    <span className="material-symbols-outlined text-4xl">search_off</span>
                                                    <p className="font-medium text-sm">No se encontraron obras archivadas con esos filtros.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Action Bar (aparece al seleccionar) */}
            {selectedArchivados.length > 0 && activeTab === 'archivados' && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-8 z-50 transition-all border border-slate-700 dark:border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/20 text-primary size-8 rounded-full flex items-center justify-center font-black text-sm">
                            {selectedArchivados.length}
                        </div>
                        <span className="font-bold text-sm">{selectedArchivados.length === 1 ? 'obra seleccionada' : 'obras seleccionadas'}</span>
                    </div>
                    <div className="w-[1px] h-8 bg-slate-700 dark:bg-slate-200"></div>
                    <div className="flex gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 dark:bg-slate-100 hover:bg-slate-700 dark:hover:bg-slate-200 rounded-xl text-sm font-bold transition-colors">
                            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                            <span className="hidden sm:inline">Exportar Informes</span>
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-black shadow-lg shadow-primary/30 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-[18px]">settings_backup_restore</span>
                            <span className="hidden sm:inline">Restaurar al sistema</span>
                            <span className="sm:hidden">Restaurar</span>
                        </button>
                    </div>
                </div>
            )}
            
        </div>
      </div>
    </div>
  );
}
