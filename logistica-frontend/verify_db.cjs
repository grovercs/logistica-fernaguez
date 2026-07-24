const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('Missing required environment variable: SUPABASE_URL');
  process.exit(1);
}

if (!supabaseServiceRoleKey) {
  console.error('Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function testInsertOrden() {
  console.log('Fetching a trabajador...');
  const { data: trabs } = await supabase.from('trabajadores').select('*').limit(1);
  const trab = trabs ? trabs[0] : null;
  console.log('Trabajador:', trab);

  if (trab) {
    console.log('Testing insert into ordenes with tecnico_id...');
    const res = await supabase.from('ordenes').insert({
      id_legible: 'OB-TEST-124',
      cliente: 'Test Client',
      estado: 'Pendiente',
      tecnico_id: trab.auth_user_id || trab.id,
      creado_en: new Date().toISOString()
    });
    console.log('Orden insert Result:', res);
  }
}

testInsertOrden();
