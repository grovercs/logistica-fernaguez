import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sortReportesByDate(reportes: any[]) {
  return [...reportes].sort((a, b) => {
    const fechaA = a.fecha_trabajo || '';
    const fechaB = b.fecha_trabajo || '';
    if (fechaA && fechaB) {
      const cmp = fechaA.localeCompare(fechaB);
      if (cmp !== 0) return cmp;
    }
    if (fechaA && !fechaB) return -1;
    if (!fechaA && fechaB) return 1;
    const creadoA = a.creado_en || '';
    const creadoB = b.creado_en || '';
    const cmpCreado = creadoA.localeCompare(creadoB);
    if (cmpCreado !== 0) return cmpCreado;
    return (a.id || '').localeCompare(b.id || '');
  });
}
