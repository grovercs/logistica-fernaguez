import { useState, useEffect } from 'react';
import NuevoReporteModal from '../components/modals/NuevoReporteModal';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function Calendario() {
  const [isNuevoReporteModalOpen, setIsNuevoReporteModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // Fecha preseleccionada para el modal
  // ordenes just for the list panel
  const [ordenes, setOrdenes] = useState<any[]>([]);
  // reportes for the calendar dots (includes join to ordenes)
  const [reportes, setReportes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');

  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const navigate = useNavigate();

  // Helper para convertir fecha a formato YYYY-MM-DD
  const formatDateToISO = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Handler para abrir el modal con una fecha específica
  const handleDayClick = (date: Date) => {
    setSelectedDate(formatDateToISO(date));
    setIsNuevoReporteModalOpen(true);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch all orders
    const { data: ordenesData } = await supabase
      .from('ordenes')
      .select('*')
      .neq('estado', 'Archivado')
      .order('creado_en', { ascending: false });
    if (ordenesData) setOrdenes(ordenesData);

    // Fetch all reports joined to orders (for calendar display by work date)
    const { data: reportesData } = await supabase
      .from('reportes')
      .select(`
        id,
        fecha_trabajo,
        horas_trabajadas,
        tecnico_id,
        orden_id,
        ordenes!inner (
          id,
          id_legible,
          cliente,
          estado,
          direccion
        )
      `)
      .neq('ordenes.estado', 'Archivado')
      .order('fecha_trabajo', { ascending: false });
    if (reportesData) setReportes(reportesData);
  };

  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    let firstDayOfWeek = new Date(year, month, 1).getDay();
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const days = [];
    
    for (let i = 0; i < firstDayOfWeek; i++) {
       days.push({ 
           date: new Date(year, month - 1, daysInPrevMonth - firstDayOfWeek + i + 1), 
           isCurrentMonth: false 
       });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
        days.push({
            date: new Date(year, month, i),
            isCurrentMonth: true
        });
    }
    
    const totalSlots = 42; 
    const slotsToFill = totalSlots - days.length;
    
    for (let i = 1; i <= slotsToFill; i++) {
        days.push({
            date: new Date(year, month + 1, i),
            isCurrentMonth: false
        });
    }
    
    return days;
  };

  const calendarDays = getCalendarDays();

  const getBadgeTheme = (estado: string) => {
    switch(estado) {
      case 'Urgente': return 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 border-red-500';
      case 'En revisión': return 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 border-purple-500';
      case 'Pendiente de firma': return 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200 border-orange-500';
      case 'Pendiente': return 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border-amber-500';
      case 'En Curso': return 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border-blue-500';
      case 'Finalizada': 
      case 'Finalizado': return 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border-green-500';
      case 'Cancelada': return 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-500';
    }
  };

  // Match a report's fecha_trabajo to a calendar day
  const getReportesForDay = (dayDate: Date) => {
    return reportes.filter(r => {
      if (!r.fecha_trabajo) return false;
      // Parse fecha_trabajo as a local date (it's YYYY-MM-DD)
      const [year, month, day] = r.fecha_trabajo.split('-').map(Number);
      const reportDate = new Date(year, month - 1, day);
      if (
        reportDate.getDate() !== dayDate.getDate() ||
        reportDate.getMonth() !== dayDate.getMonth() ||
        reportDate.getFullYear() !== dayDate.getFullYear()
      ) return false;

      const orden = r.ordenes;
      if (estadoFilter && orden?.estado !== estadoFilter) return false;
      if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        if (
          !(orden?.cliente || '').toLowerCase().includes(lower) &&
          !(orden?.id_legible || '').toLowerCase().includes(lower)
        ) return false;
      }
      return true;
    });
  };

  // Orders always appear on their creation date
  const getOrdenesForDay = (dayDate: Date) => {
    return ordenes.filter(o => {
      const d = new Date(o.creado_en);
      if (
        d.getDate() !== dayDate.getDate() ||
        d.getMonth() !== dayDate.getMonth() ||
        d.getFullYear() !== dayDate.getFullYear()
      ) return false;
      if (estadoFilter && o.estado !== estadoFilter) return false;
      if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        if (
          !(o.cliente || '').toLowerCase().includes(lower) &&
          !(o.id_legible || '').toLowerCase().includes(lower)
        ) return false;
      }
      return true;
    });
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark overflow-hidden w-full h-full">
      <NuevoReporteModal
        isOpen={isNuevoReporteModalOpen}
        onClose={() => {
          setIsNuevoReporteModalOpen(false);
          setSelectedDate(null);
        }}
        onCreated={fetchData}
        fechaInicial={selectedDate || undefined}
      />
      {/* Header */}
      <header className="flex flex-col border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm z-10 w-full">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4 flex-1">
            <h2 className="text-xl font-bold whitespace-nowrap">Calendario de Intervenciones</h2>
            <div className="relative max-w-md w-full ml-4">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <span className="material-symbols-outlined text-xl">search</span>
              </span>
              <input 
                  className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg focus:ring-2 focus:ring-primary text-sm" 
                  placeholder="Buscar por referencia o cliente..." 
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-2"></div>
            <button 
              onClick={() => setIsNuevoReporteModalOpen(true)}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors"
            >
              <span className="material-symbols-outlined">add</span>
              Nuevo Reporte
            </button>
          </div>
        </div>
        
        {/* Navigation Bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-4">
            <button 
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
                <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <span className="font-bold text-lg min-w-[150px] text-center capitalize">
                {currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
            </span>
            <button 
                 onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                 className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
                <span className="material-symbols-outlined">chevron_right</span>
            </button>
            <button 
                 onClick={() => setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1))}
                 className="ml-4 px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
                Hoy
            </button>
          </div>
          <div className="flex items-center gap-2">
             <span className="text-xs font-bold text-slate-500 uppercase mr-2 hidden md:inline-block">Filtros:</span>
             <select 
               className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium focus:ring-primary px-3 py-1.5 min-w-[130px]"
               value={estadoFilter}
               onChange={(e) => setEstadoFilter(e.target.value)}
             >
                <option value="">Todos los Estados</option>
                <option value="Urgente">🔴 Urgente</option>
                <option value="Pendiente">🟡 Pendiente</option>
                <option value="En Curso">🔵 En Curso</option>
                <option value="En revisión">🟣 En revisión</option>
                <option value="Pendiente de firma">🟠 Firma Pendiente</option>
                <option value="Finalizada">🟢 Finalizada</option>
                <option value="Cancelada">⚪ Cancelada</option>
             </select>
          </div>
        </div>
      </header>
      
      {/* Calendar Container */}
      <div className="flex-1 overflow-y-auto p-4 w-full">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-fit min-h-full">
          {/* Calendar Days Header */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => (
                <div key={day} className="py-3 text-center text-xs font-bold text-slate-500 uppercase">{day}</div>
            ))}
          </div>
          
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 auto-rows-[minmax(120px,auto)] flex-1">
             {calendarDays.map((dayObj, idx) => {
                 const isToday = today.toDateString() === dayObj.date.toDateString();
                 const dayReportes = getReportesForDay(dayObj.date);
                 const dayOrdenes = getOrdenesForDay(dayObj.date);

                 return (
                     <div
                        key={idx}
                        className={`group border-r border-b border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-1 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${!dayObj.isCurrentMonth ? 'bg-slate-50/50 dark:bg-slate-800/20 opacity-40' : ''} ${isToday ? 'bg-primary/5' : ''}`}
                     >
                         <div className="flex items-center justify-between">
                           <span className={`text-sm ${isToday ? 'font-bold text-primary underline' : 'font-medium'}`}>
                              {dayObj.date.getDate()} {isToday ? '(Hoy)' : ''}
                           </span>
                           <button
                             onClick={(e) => {
                               e.stopPropagation();
                               handleDayClick(dayObj.date);
                             }}
                             className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-primary text-slate-400 hover:text-primary transition-all"
                             title="Crear nuevo reporte en esta fecha"
                           >
                             <span className="material-symbols-outlined text-[16px]">add</span>
                           </button>
                         </div>

                         <div className="flex-1 mx-1 overflow-y-auto space-y-1 mt-1 pb-1 scrollbar-thin">
                             {/* Reports (work done on this day — most important) */}
                             {dayReportes.map(rep => (
                                 <div
                                    key={rep.id}
                                    onClick={() => navigate(`/ordenes/${rep.orden_id}`)}
                                    className={`text-[10px] p-1.5 rounded border-l-4 font-semibold truncate cursor-pointer hover:opacity-80 transition-opacity ${getBadgeTheme(rep.ordenes?.estado)}`}
                                    title={`${rep.ordenes?.id_legible} · ${rep.ordenes?.cliente} · ${rep.horas_trabajadas}h`}
                                 >
                                     <span className="material-symbols-outlined text-[10px] mr-0.5 align-middle">engineering</span>
                                     {rep.ordenes?.id_legible} · {rep.ordenes?.cliente}
                                     {rep.horas_trabajadas ? <span className="ml-1 opacity-70">({rep.horas_trabajadas}h)</span> : ''}
                                 </div>
                             ))}
                             {/* Orders pinned to creation date */}
                             {dayOrdenes.map(orden => (
                                 <div
                                    key={orden.id}
                                    onClick={() => navigate(`/ordenes/${orden.id}`)}
                                    className={`text-[10px] p-1.5 rounded border-l-4 font-semibold truncate cursor-pointer hover:shadow-sm hover:opacity-90 active:opacity-70 transition-all ${getBadgeTheme(orden.estado)}`}
                                    title={`${orden.id_legible} - ${orden.cliente}`}
                                 >
                                     <span className="material-symbols-outlined text-[10px] mr-0.5 align-middle">folder_open</span>
                                     {orden.id_legible} · {orden.cliente}
                                 </div>
                             ))}
                         </div>
                     </div>
                 );
             })}
          </div>
          
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Urgente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Pendiente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">En Curso</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">En revisión</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Firma Pendiente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Finalizada</span>
            </div>
            <div className="ml-auto flex items-center gap-4 text-slate-400 text-[10px] sm:text-xs">
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">engineering</span>
                <span>Intervención (Técnico)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">folder_open</span>
                <span>Alta de Orden</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
