const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../logistica-frontend/.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Faltan variables de entorno en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('--- DIAGNÓSTICO DE BASE DE DATOS ---');

  // 1. Ver un trabajador para ver sus IDs
  const { data: trabajadores } = await supabase.from('trabajadores').select('*').limit(1);
  console.log('Ejemplo de trabajador:', trabajadores?.[0]);

  // 2. Ver una orden para ver sus IDs
  const { data: ordenes } = await supabase.from('ordenes').select('*').limit(1);
  console.log('Ejemplo de orden:', ordenes?.[0]);

  // 3. Intentar ver las restricciones de la tabla orden_asignaciones si es posible
  // Nota: Esto es limitado via anon key, pero probaremos a insertar un dummy para ver el error real
  console.log('Probando inserción controlada...');
  const { error } = await supabase.from('orden_asignaciones').insert({
    orden_id: '00000000-0000-0000-0000-000000000000', // ID falso
    trabajador_id: '00000000-0000-0000-0000-000000000000'
  });
  
  if (error) {
    console.log('Error capturado:', error.message, error.code, error.details);
  }
}

checkSchema();
