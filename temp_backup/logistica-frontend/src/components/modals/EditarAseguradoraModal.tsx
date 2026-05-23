import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

interface EditarAseguradoraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  aseguradoraData: any;
}

export default function EditarAseguradoraModal({ isOpen, onClose, onUpdated, aseguradoraData }: EditarAseguradoraModalProps) {
  const [formData, setFormData] = useState({
     nombre: '',
     cif: '',
     persona_contacto: '',
     email: '',
     telefono: '',
     web: '',
     direccion: '',
     estado: 'Activa'
  });
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [existingLogo, setExistingLogo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && aseguradoraData) {
        setFormData({
            nombre: aseguradoraData.nombre || '',
            cif: aseguradoraData.cif || '',
            persona_contacto: aseguradoraData.persona_contacto || '',
            email: aseguradoraData.email || '',
            telefono: aseguradoraData.telefono || '',
            web: aseguradoraData.web || '',
            direccion: aseguradoraData.direccion || '',
            estado: aseguradoraData.estado || 'Activa',
        });
        setExistingLogo(aseguradoraData.logo_url || null);
        setLogoPreview(null);
        setLogoFile(null);
    }
  }, [isOpen, aseguradoraData]);

  if (!isOpen) return null;

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('El archivo es demasiado grande. El tamaño máximo es 5MB.');
        return;
      }
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecciona un archivo de imagen.');
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `logos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading logo:', uploadError);
      return null;
    }

    const { data } = supabase.storage.from('logos').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);

      let logoUrl: string | null | undefined = undefined;
      if (logoFile) {
        logoUrl = await uploadLogo(logoFile);
      } else if (existingLogo) {
        logoUrl = existingLogo;
      }

      const updateData: any = {
          nombre: formData.nombre,
          persona_contacto: formData.persona_contacto,
          telefono: formData.telefono,
          email: formData.email,
          estado: formData.estado,
          cif: formData.cif,
          web: formData.web,
          direccion: formData.direccion,
      };

      if (logoUrl !== undefined) {
        updateData.logo_url = logoUrl;
      }

      const { error } = await supabase
          .from('aseguradoras')
          .update(updateData)
          .eq('id', aseguradoraData.id);

      setLoading(false);
      if (!error) {
          if (onUpdated) onUpdated();
          onClose();
      } else {
          console.error("Error updating aseguradora:", error);
          alert("Error al actualizar el cliente.");
      }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Editar Cliente</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Modifica los datos de <span className="font-bold text-primary">{aseguradoraData?.nombre}</span>.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined block">close</span>
          </button>
        </div>

        <div className="p-8 overflow-y-auto max-h-[70vh]">
          <form id="editarAseguradoraForm" onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Nombre del Cliente / Empresa *</label>
              <input
                 className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                 placeholder="Ej. Empresa Ejemplo S.L."
                 type="text"
                 required
                 value={formData.nombre}
                 onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">CIF / NIF</label>
              <input
                 className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                 placeholder="B12345678"
                 type="text"
                 value={formData.cif}
                 onChange={(e) => setFormData({...formData, cif: e.target.value})}
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Persona de Contacto</label>
              <input
                 className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                 placeholder="Nombre completo"
                 type="text"
                 value={formData.persona_contacto}
                 onChange={(e) => setFormData({...formData, persona_contacto: e.target.value})}
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Teléfono</label>
              <input
                 className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                 placeholder="+34 900 000 000"
                 type="tel"
                 value={formData.telefono}
                 onChange={(e) => setFormData({...formData, telefono: e.target.value})}
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Email de Contacto</label>
              <input
                 className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                 placeholder="contacto@empresa.com"
                 type="email"
                 value={formData.email}
                 onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Sitio Web</label>
              <input
                 className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                 placeholder="https://www.ejemplo.com"
                 type="url"
                 value={formData.web}
                 onChange={(e) => setFormData({...formData, web: e.target.value})}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Dirección</label>
              <input
                 className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                 placeholder="Calle, Número, Ciudad, CP"
                 type="text"
                 value={formData.direccion}
                 onChange={(e) => setFormData({...formData, direccion: e.target.value})}
              />
            </div>

            {/* Logo */}
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Logo de la Empresa</label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center gap-2 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
              >
                {logoPreview || existingLogo ? (
                  <img src={logoPreview || existingLogo || ''} alt="Logo" className="h-12 w-auto object-contain rounded" />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-2xl text-slate-400 group-hover:text-primary transition-colors">upload_file</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Subir logo</span>
                  </>
                )}
              </div>
              {(logoPreview || existingLogo) && (
                <button
                  type="button"
                  onClick={() => { setLogoFile(null); setLogoPreview(null); setExistingLogo(null); }}
                  className="mt-2 text-xs text-red-500 hover:text-red-600"
                >
                  Quitar logo
                </button>
              )}
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Estado</label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  checked={formData.estado === 'Activa'}
                  onChange={(e) => setFormData({...formData, estado: e.target.checked ? 'Activa' : 'Inactiva'})}
                  className="sr-only peer"
                  type="checkbox"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                <span className="ms-3 text-sm font-medium text-slate-900 dark:text-slate-300">Activa</span>
              </label>
            </div>
            
          </form>
        </div>
        
        <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-800/30">
          <button 
             onClick={onClose}
             type="button"
             className="px-6 py-2.5 rounded-lg font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all border border-transparent shadow-sm"
          >
             Cancelar
          </button>
          <button 
             type="submit"
             disabled={loading}
             form="editarAseguradoraForm"
             className="px-8 py-2.5 rounded-lg font-bold text-sm bg-sky-500 hover:bg-sky-600 text-white transition-all shadow-sm"
          >
             {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
        
      </div>
    </div>
  );
}
