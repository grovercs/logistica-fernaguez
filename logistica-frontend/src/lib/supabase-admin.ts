import { supabase } from './supabase';

/**
 * Compatibilidad temporal para módulos administrativos fuera del bundle.
 * Nunca debe crearse un cliente privilegiado en el navegador.
 */
export const supabaseAdmin = supabase;
