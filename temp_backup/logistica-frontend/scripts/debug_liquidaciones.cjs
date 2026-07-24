const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('c:/wamp64/www/logisticafernaguez/logistica-frontend/.env.local', 'utf8');
envContent.split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function debug() {
    console.log('=== REPORTES COUNT ===');
    const { data: rep, error: repErr } = await s.from('reportes').select('id, orden_id, tecnico_id, horas_trabajadas, creado_en').limit(5);
    if (repErr) console.error('Error:', repErr.message);
    else console.log(`Total rows returned (limit 5):`, rep?.length, rep);

    console.log('\n=== ORDENES WITH TECNICO ===');
    const { data: ord } = await s.from('ordenes').select('id_legible, cliente, estado, tecnico_id').not('tecnico_id', 'is', null).limit(10);
    console.log('Orders with a tecnico_id:', ord?.length, ord);

    console.log('\n=== PERFILES CHECK ===');
    const { data: prf } = await s.from('perfiles').select('id, nombre_completo, tarifa_hora').limit(5);
    console.log('Perfiles (first 5):', prf);

    console.log('\n=== JOIN TEST ===');
    const { data: joined, error: joinErr } = await s
        .from('reportes')
        .select('id, horas_trabajadas, creado_en, ordenes(id_legible, cliente), perfiles(nombre_completo, tarifa_hora)')
        .limit(3);
    if (joinErr) console.error('Join error:', joinErr.message);
    else console.log('Join result:', JSON.stringify(joined, null, 2));
}

debug().catch(console.error);
