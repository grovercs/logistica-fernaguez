import React from 'react';

export default function Ordenes() {
  return (
    <div className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 w-full h-full">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 w-full">
        <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-primary material-symbols-outlined">assignment</span>
              <h2 className="text-xl font-bold">Detalle de Intervención</h2>
            </div>
            <p className="text-slate-500 text-sm font-medium">Reporte: <span className="text-primary">3738</span></p>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
              <span className="material-symbols-outlined text-[18px]">edit</span>
              Editar
            </button>
            <button className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
              <span className="material-symbols-outlined text-[18px]">print</span>
              Imprimir
            </button>
            <button className="flex items-center gap-2 bg-primary text-white hover:bg-primary/90 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
              <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
              Exportar PDF
            </button>
          </div>
        </div>
      </header>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto">
          {/* Left Column: Report Details (Information Section) */}
          <div className="lg:col-span-4 space-y-6">
            
            <section className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">assignment</span>
                  <h3 className="font-bold text-sm">Reporte</h3>
                </div>
              </div>
              
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {/* Referencia */}
                <div className="p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-[16px]">book</span>
                    <label className="text-xs font-bold uppercase tracking-wider">Referencia</label>
                  </div>
                  <p className="text-sm font-medium pl-6">Adrian San Miguel</p>
                </div>
                
                {/* Parte de Avería */}
                <div className="p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-[16px]">location_on</span>
                    <label className="text-xs font-bold uppercase tracking-wider">Parte de Avería</label>
                  </div>
                  <div className="pl-6">
                    <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 uppercase">no</span>
                  </div>
                </div>

                {/* Trabajo */}
                <div className="p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    <label className="text-xs font-bold uppercase tracking-wider">Trabajo</label>
                  </div>
                  <div className="pl-6">
                    <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 uppercase">yes</span>
                  </div>
                </div>

                {/* Otras Órdenes */}
                <div className="p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-[16px]">description</span>
                    <label className="text-xs font-bold uppercase tracking-wider">Otras Órdenes</label>
                  </div>
                  <p className="text-sm font-medium pl-6 italic text-slate-400">-</p>
                </div>

                {/* Asegurado */}
                <div className="p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-[16px]">person</span>
                    <label className="text-xs font-bold uppercase tracking-wider">Asegurado</label>
                  </div>
                  <p className="text-sm font-medium pl-6 italic text-slate-400">-</p>
                </div>

                {/* Teléfono Asegurado */}
                <div className="p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-[16px]">call</span>
                    <label className="text-xs font-bold uppercase tracking-wider">Teléfono Asegurado</label>
                  </div>
                  <p className="text-sm font-medium pl-6 italic text-slate-400">-</p>
                </div>

                {/* Email */}
                <div className="p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-[16px]">mail</span>
                    <label className="text-xs font-bold uppercase tracking-wider">Email</label>
                  </div>
                  <p className="text-sm font-medium pl-6 italic text-slate-400">-</p>
                </div>

                {/* Persona de Contacto */}
                <div className="p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-[16px]">contact_page</span>
                    <label className="text-xs font-bold uppercase tracking-wider">Persona de Contacto</label>
                  </div>
                  <p className="text-sm font-medium pl-6 italic text-slate-400">-</p>
                </div>

                {/* Teléfono Persona Contacto */}
                <div className="p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-[16px]">phone_iphone</span>
                    <label className="text-xs font-bold uppercase tracking-wider">Teléfono Persona Contacto</label>
                  </div>
                  <p className="text-sm font-medium pl-6 italic text-slate-400">-</p>
                </div>

                {/* Dirección */}
                <div className="p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-[16px]">home</span>
                    <label className="text-xs font-bold uppercase tracking-wider">Dirección</label>
                  </div>
                  <p className="text-sm font-medium pl-6 italic text-slate-400">-</p>
                </div>

                {/* Observaciones */}
                <div className="p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-[16px]">edit_note</span>
                    <label className="text-xs font-bold uppercase tracking-wider">Observaciones</label>
                  </div>
                  <p className="text-sm font-medium pl-6 text-slate-700 dark:text-slate-300">Averia de agua</p>
                </div>

                {/* Estado */}
                <div className="p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-[16px]">info</span>
                    <label className="text-xs font-bold uppercase tracking-wider">Estado</label>
                  </div>
                  <p className="text-sm font-medium pl-6">incourse</p>
                </div>

                {/* Acción */}
                <div className="p-4 flex flex-col gap-1 bg-slate-50 dark:bg-slate-800/20">
                  <div className="flex items-center gap-2 text-slate-500 mb-2">
                    <span className="material-symbols-outlined text-[16px]">touch_app</span>
                    <label className="text-xs font-bold uppercase tracking-wider">Acción</label>
                  </div>
                  <div className="pl-6 flex gap-2">
                    <button className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-bold transition-colors shadow-sm">Agregar</button>
                    <button className="px-3 py-1 bg-sky-500 hover:bg-sky-600 text-white rounded text-xs font-bold transition-colors shadow-sm">Editar</button>
                    <button className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-bold transition-colors shadow-sm">Borrar</button>
                  </div>
                </div>

              </div>
            </section>
          </div>

          {/* Right Column: Timeline and Details */}
          <div className="lg:col-span-8 space-y-6">
            
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col">
              
              {/* Timeline Items */}
              <div className="p-6">
                <div className="relative space-y-8 before:absolute before:inset-0 before:ml-[34px] before:-translate-x-px before:h-full before:w-[2px] before:bg-slate-200 dark:before:bg-slate-800">
                  
                  {/* Date Badge */}
                  <div className="relative flex items-center mb-8">
                     <span className="bg-orange-500 text-white px-3 py-1 rounded text-sm font-bold shadow-sm z-10 relative">2026-02-21</span>
                  </div>

                  {/* Intervention Item */}
                  <div className="relative flex items-start group">
                    <div className="absolute left-4 flex items-center justify-center w-9 h-9 rounded-full bg-primary text-white border-[3px] border-white dark:border-slate-900 z-10">
                      <span className="material-symbols-outlined text-[18px]">mail</span>
                    </div>

                    <div className="ml-16 flex-1 border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20 rounded-lg overflow-hidden">
                      {/* Header */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          <span className="text-primary font-bold mr-1">Trabajos</span> 
                          proteger, picar para localizar avería, recoger
                        </p>
                        <time className="text-xs font-bold text-slate-500 flex items-center gap-1 mt-2 md:mt-0">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          2:0 hr
                        </time>
                      </div>
                      
                      {/* Worker List */}
                      <div className="p-4">
                        <p className="text-sm text-slate-700 dark:text-slate-300 mb-1">Lista Trabajadores:</p>
                        <p className="text-sm text-slate-900 dark:text-white font-medium mb-4">Marcos Martinas</p>

                        <p className="text-sm text-slate-700 dark:text-slate-300 mb-1">Materiales Utilizados:</p>
                        <p className="text-sm text-slate-900 dark:text-white font-medium mb-4">papel suelo cinta</p>

                        {/* Images */}
                        <div className="space-y-4 max-w-sm mt-6">
                           <img 
                              className="w-full rounded-md shadow-sm border border-slate-200 dark:border-slate-700 object-cover" 
                              src="https://images.unsplash.com/photo-1595841696677-6489ff3f8cd1?auto=format&fit=crop&q=80&w=400" 
                              alt="Tubería dañada pared" 
                           />
                           <img 
                              className="w-full rounded-md shadow-sm border border-slate-200 dark:border-slate-700 object-cover" 
                              src="https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&q=80&w=400"  
                              alt="Tubería dañada pared 2" 
                           />
                        </div>
                      </div>

                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* Conformidad del Cliente */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden mt-6">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">draw</span>
                <h3 className="font-bold text-sm">Conformidad del Cliente</h3>
              </div>
              <div className="p-6">
                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                  
                  {/* Vista previa de la firma */}
                  <div className="w-full md:w-1/2">
                    <p className="text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-2">Firma Digital</p>
                    <div className="bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg h-32 flex items-center justify-center overflow-hidden cursor-crosshair">
                      {/* Aquí iría el canvas de la firma o la imagen de la firma guardada */}
                      <span className="text-3xl font-serif italic text-slate-400 dark:text-slate-600 select-none">Firma aquí...</span>
                    </div>
                  </div>
                  
                  {/* Datos de la firma */}
                  <div className="w-full md:w-1/2 space-y-4">
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Firmado por</label>
                      <p className="text-sm font-medium">Pendiente de firma</p>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Fecha y Hora de Firma</label>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="material-symbols-outlined text-slate-400 text-[18px]">event_available</span>
                        <p className="text-sm text-slate-500 font-medium">---</p>
                      </div>
                    </div>
                    <div className="pt-2">
                      <p className="text-[10px] text-slate-500 leading-tight italic">
                        Al firmar, el cliente confirma que los trabajos descritos han sido realizados a su entera satisfacción.
                      </p>
                    </div>
                    <button className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors w-full flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">edit_document</span>
                      Firmar Reporte
                    </button>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
