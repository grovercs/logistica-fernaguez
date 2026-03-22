const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tqwxvryvhwijbsixmzkq.supabase.co';
const supabaseKey = 'sb_publishable_Rx8vjp972G_IoQ2FNbRoGg_w-baIwh7';

const supabase = createClient(supabaseUrl, supabaseKey);

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
