import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Este cliente tiene permisos de administrador. Solo debe usarse en el panel de admin,
// nunca exponerlo en la app móvil ni en partes públicas del sitio.
export const supabaseAdmin = createClient(supabaseUrl || '', serviceRoleKey || '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
