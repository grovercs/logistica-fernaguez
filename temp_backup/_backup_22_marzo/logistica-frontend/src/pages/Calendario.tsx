import { useState } from 'react';
import NuevoReporteModal from '../components/modals/NuevoReporteModal';

export default function Calendario() {
  const [isNuevoReporteModalOpen, setIsNuevoReporteModalOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark overflow-hidden w-full h-full">
      <NuevoReporteModal 
        isOpen={isNuevoReporteModalOpen} 
        onClose={() => setIsNuevoReporteModalOpen(false)} 
      />
      {/* Header with Search and Export */}
      <header className="flex flex-col border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm z-10 w-full">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4 flex-1">
            <h2 className="text-xl font-bold whitespace-nowrap">Calendario de Intervenciones</h2>
            <div className="relative max-w-md w-full ml-4">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <span className="material-symbols-outlined text-xl">search</span>
              </span>
              <input className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg focus:ring-2 focus:ring-primary text-sm" placeholder="Buscar por referencia, cliente o ID..." type="text"/>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-semibold transition-colors">
              <span className="material-symbols-outlined text-red-500 text-lg">picture_as_pdf</span>
              PDF
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-semibold transition-colors">
              <span className="material-symbols-outlined text-green-600 text-lg">description</span>
              Excel
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-semibold transition-colors">
              <span className="material-symbols-outlined text-slate-600 text-lg">print</span>
              Imprimir
            </button>
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
        
        {/* Filters Bar */}
        <div className="flex items-center gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Filtros:</span>
          </div>
          <select className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium focus:ring-primary px-3 py-1.5 min-w-[140px]">
            <option>Todos los Técnicos</option>
            <option>Carlos Ruiz</option>
            <option>Elena Gómez</option>
            <option>Marcos Torres</option>
          </select>
          <select className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium focus:ring-primary px-3 py-1.5 min-w-[140px]">
            <option>Todos los Clientes</option>
            <option>Residencial Altavista</option>
            <option>Hotel Plaza</option>
            <option>Oficinas Central</option>
          </select>
          <select className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium focus:ring-primary px-3 py-1.5 min-w-[140px]">
            <option>Cualquier Estado</option>
            <option>Pendiente</option>
            <option>En Curso</option>
            <option>Completado</option>
          </select>
          <select className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium focus:ring-primary px-3 py-1.5 min-w-[140px]">
            <option>Aseguradora</option>
            <option>Mapfre</option>
            <option>Allianz</option>
            <option>AXA</option>
          </select>
          <div className="flex-1"></div>
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
            <button className="px-3 py-1 text-xs font-bold rounded-md bg-primary text-white">Mes</button>
            <button className="px-3 py-1 text-xs font-bold rounded-md hover:bg-slate-100 dark:hover:bg-slate-700">Semana</button>
            <button className="px-3 py-1 text-xs font-bold rounded-md hover:bg-slate-100 dark:hover:bg-slate-700">Día</button>
          </div>
        </div>
      </header>
      
      {/* Calendar Container */}
      <div className="flex-1 overflow-y-auto p-4 w-full">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-fit min-h-full">
          {/* Calendar Days Header */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <div className="py-3 text-center text-xs font-bold text-slate-500 uppercase">Domingo</div>
            <div className="py-3 text-center text-xs font-bold text-slate-500 uppercase">Lunes</div>
            <div className="py-3 text-center text-xs font-bold text-slate-500 uppercase">Martes</div>
            <div className="py-3 text-center text-xs font-bold text-slate-500 uppercase">Miércoles</div>
            <div className="py-3 text-center text-xs font-bold text-slate-500 uppercase">Jueves</div>
            <div className="py-3 text-center text-xs font-bold text-slate-500 uppercase">Viernes</div>
            <div className="py-3 text-center text-xs font-bold text-slate-500 uppercase">Sábado</div>
          </div>
          
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 auto-rows-[minmax(120px,auto)] flex-1">
            {/* Row 1: Previous Month Days */}
            <div className="border-r border-b border-slate-100 dark:border-slate-800 p-2 bg-slate-50/50 dark:bg-slate-800/20 opacity-40">
              <span className="text-sm font-medium">29</span>
            </div>
            <div className="border-r border-b border-slate-100 dark:border-slate-800 p-2 bg-slate-50/50 dark:bg-slate-800/20 opacity-40">
              <span className="text-sm font-medium">30</span>
            </div>
            <div className="border-r border-b border-slate-100 dark:border-slate-800 p-2 bg-slate-50/50 dark:bg-slate-800/20 opacity-40">
              <span className="text-sm font-medium">31</span>
            </div>
            
            {/* Row 1: Current Month Starts */}
            <div className="border-r border-b border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-1 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <span className="text-sm font-bold text-primary">1</span>
              <div className="text-[10px] p-1.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border-l-4 border-blue-500 font-semibold truncate cursor-pointer">
                REF-4501 · Mapfre
              </div>
              <div className="text-[10px] p-1.5 rounded bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200 border-l-4 border-orange-500 font-semibold truncate cursor-pointer">
                REF-4502 · Res. Altavista
              </div>
            </div>
            <div className="border-r border-b border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-1 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <span className="text-sm font-medium">2</span>
            </div>
            <div className="border-r border-b border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-1 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <span className="text-sm font-medium">3</span>
              <div className="text-[10px] p-1.5 rounded bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border-l-4 border-green-500 font-semibold truncate cursor-pointer">
                REF-4508 · Allianz S.A.
              </div>
            </div>
            <div className="border-b border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-1 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <span className="text-sm font-medium">4</span>
            </div>
            
            {/* Row 2 */}
            <div className="border-r border-b border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-1 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <span className="text-sm font-medium">5</span>
            </div>
            <div className="border-r border-b border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-1 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors bg-primary/5">
              <span className="text-sm font-bold text-primary underline">6 (Hoy)</span>
              <div className="text-[10px] p-1.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border-l-4 border-blue-500 font-semibold truncate cursor-pointer">
                REF-4512 · AXA Hogar
              </div>
              <div className="text-[10px] p-1.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border-l-4 border-blue-500 font-semibold truncate cursor-pointer">
                REF-4515 · Juan Pérez
              </div>
              <div className="text-[10px] p-1.5 rounded bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 border-l-4 border-yellow-500 font-semibold truncate cursor-pointer">
                REF-4519 · Mutua Mad.
              </div>
            </div>
            <div className="border-r border-b border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-1 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <span className="text-sm font-medium">7</span>
            </div>
            <div className="border-r border-b border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-1 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <span className="text-sm font-medium">8</span>
              <div className="text-[10px] p-1.5 rounded bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border-l-4 border-green-500 font-semibold truncate cursor-pointer">
                REF-4522 · Santalucía
              </div>
            </div>
            <div className="border-r border-b border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-1 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <span className="text-sm font-medium">9</span>
            </div>
            <div className="border-r border-b border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-1 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <span className="text-sm font-medium">10</span>
              <div className="text-[10px] p-1.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border-l-4 border-blue-500 font-semibold truncate cursor-pointer">
                REF-4525 · Hotel Ritz
              </div>
            </div>
            <div className="border-b border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-1 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <span className="text-sm font-medium">11</span>
            </div>
            
            {/* Row 3 */}
            <div className="border-r border-b border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-1 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <span className="text-sm font-medium">12</span>
            </div>
            <div className="border-r border-b border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-1 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <span className="text-sm font-medium">13</span>
            </div>
            <div className="border-r border-b border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-1 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <span className="text-sm font-medium">14</span>
              <div className="text-[10px] p-1.5 rounded bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200 border-l-4 border-orange-500 font-semibold truncate cursor-pointer">
                REF-4530 · Iberdrola
              </div>
              <div className="text-[10px] p-1.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border-l-4 border-blue-500 font-semibold truncate cursor-pointer">
                REF-4531 · Repsol
              </div>
              <div className="text-[10px] p-1.5 rounded bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 border-l-4 border-red-500 font-semibold truncate cursor-pointer">
                URGENTE · Gas Natural
              </div>
              <div className="text-[10px] p-1.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-center">
                +3 más
              </div>
            </div>
            <div className="border-r border-b border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-1 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <span className="text-sm font-medium">15</span>
            </div>
            <div className="border-r border-b border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-1 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <span className="text-sm font-medium">16</span>
            </div>
            <div className="border-r border-b border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-1 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <span className="text-sm font-medium">17</span>
            </div>
            <div className="border-b border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-1 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <span className="text-sm font-medium">18</span>
            </div>
            
            {/* Row 4 */}
            <div className="border-r border-b border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-1 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <span className="text-sm font-medium">19</span>
            </div>
            <div className="border-r border-b border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-1 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <span className="text-sm font-medium">20</span>
            </div>
            <div className="border-r border-b border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-1 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <span className="text-sm font-medium">21</span>
            </div>
            <div className="border-r border-b border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-1 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <span className="text-sm font-medium">22</span>
            </div>
            <div className="border-r border-b border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-1 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <span className="text-sm font-medium">23</span>
            </div>
            <div className="border-r border-b border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-1 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <span className="text-sm font-medium">24</span>
            </div>
            <div className="border-b border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-1 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <span className="text-sm font-medium">25</span>
            </div>
            
            {/* Row 5 */}
            <div className="border-r border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-1 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <span className="text-sm font-medium">26</span>
            </div>
            <div className="border-r border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-1 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <span className="text-sm font-medium">27</span>
            </div>
            <div className="border-r border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-1 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <span className="text-sm font-medium">28</span>
            </div>
            <div className="border-r border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-1 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <span className="text-sm font-medium">29</span>
            </div>
            <div className="border-r border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-1 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <span className="text-sm font-medium">30</span>
            </div>
            <div className="border-r border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-1 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <span className="text-sm font-medium">31</span>
            </div>
            <div className="p-2 flex flex-col gap-1 bg-slate-50/50 dark:bg-slate-800/20 opacity-40">
              <span className="text-sm font-medium">1</span>
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex items-center gap-6 p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Pendiente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">En Curso</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Completado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">En Revisión</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Urgente</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
