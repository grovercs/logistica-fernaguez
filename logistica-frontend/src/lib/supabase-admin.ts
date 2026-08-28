import { supabase } from './supabase';

/**
 * Compatibilidad temporal para módulos administrativos fuera del bundle.
 * Nunca debe crearse un cliente privilegiado en el navegador.
 * Las operaciones de Auth Admin deben ejecutarse en Netlify Edge Functions.
 */
export const supabaseAdmin = supabase;

if (typeof window !== 'undefined') {
  console.error(
    '[SEGURIDAD] supabase-admin.ts se cargó en el navegador. ' +
      'Las funciones admin deben ir por Netlify Functions con SUPABASE_SERVICE_ROLE_KEY.'
  );
}
