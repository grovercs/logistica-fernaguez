import { useState } from 'react';

const MobileDetalleOrden = () => {
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

    return (
        <div className="pb-24">
            {/* Cabecera OT */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sticky top-0 z-10 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-primary material-symbols-outlined">assignment</span>
                            <h2 className="text-lg font-bold">Detalle de OT</h2>
                        </div>
                        <p className="text-slate-500 text-xs font-medium mt-0.5">Referencia: <span className="text-primary font-bold">#OT-2024-001</span></p>
                    </div>
                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-100 text-green-700">En Curso</span>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Cliente */}
                <section className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[18px]">person</span>
                        <h3 className="font-bold text-sm">Cliente</h3>
                    </div>
                    <div className="p-3 space-y-3">
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Nombre</label>
                            <p className="text-sm font-medium">Juan Pérez Rodríguez</p>
                        </div>
                        <div className="flex justify-between items-center">
                            <div>
                                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Dirección</label>
                                <p className="text-sm font-medium">Calle Mayor 12, 3º B, Madrid</p>
                            </div>
                            <button className="text-primary bg-primary/10 rounded-full p-2 h-9 w-9 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[18px]">map</span>
                            </button>
                        </div>
                    </div>
                </section>

                {/* Historial de Intervenciones */}
                <section className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-[18px]">history</span>
                            <h3 className="font-bold text-sm">Intervenciones</h3>
                        </div>
                        <button className="bg-primary/10 text-primary hover:bg-primary border border-transparent hover:border-primary text-xs font-bold px-2 py-1 rounded transition-colors hover:text-white flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">add</span> Añadir
                        </button>
                    </div>
                    <div className="p-4">
                        <div className="relative space-y-6 before:absolute before:inset-0 before:ml-4 before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                            {/* Intervención Card */}
                            <div className="relative flex items-start">
                                <div className="absolute left-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white ring-4 ring-white dark:ring-slate-900">
                                    <span className="material-symbols-outlined text-[16px]">build</span>
                                </div>
                                <div className="ml-12 flex-1 pt-1.5">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">Juan P. (Yo)</h4>
                                        <time className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">4.5h</time>
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">Desescombro y reparación tubería cocina. Material: cobre 15mm.</p>
                                    
                                    {/* Evidencias */}
                                    <div className="flex gap-2">
                                        <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded flex items-center justify-center relative overflow-hidden">
                                             <span className="material-symbols-outlined text-slate-400 text-[18px]">image</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Firma Digital */}
                <section className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50">
                        <span className="material-symbols-outlined text-primary text-[18px]">draw</span>
                        <h3 className="font-bold text-sm">Firma del Cliente</h3>
                    </div>
                    <div className="p-4 text-center">
                        <p className="text-xs text-slate-500 mb-4">El cliente debe firmar para cerrar la OT.</p>
                        <button 
                            onClick={() => setIsSignatureModalOpen(true)}
                            className="bg-primary text-white w-full py-3 rounded-lg font-bold shadow shadow-primary/30 flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined">edit_document</span>
                            Recoger Firma
                        </button>
                    </div>
                </section>
            </div>

            {/* Modal de Firma (Simulado) */}
            {isSignatureModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
                    <div className="bg-white dark:bg-slate-900 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4 transition-transform transform">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold">Firma Digital</h3>
                            <button onClick={() => setIsSignatureModalOpen(false)} className="text-slate-400 p-1">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 h-48 rounded-lg flex items-center justify-center mb-4">
                            <span className="text-slate-400 text-sm">Área para firmar (Canvas)</span>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setIsSignatureModalOpen(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-sm">Cancelar</button>
                            <button onClick={() => setIsSignatureModalOpen(false)} className="flex-1 py-3 bg-primary text-white rounded-lg font-bold text-sm">Guardar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MobileDetalleOrden;
