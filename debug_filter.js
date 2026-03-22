const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from logistica-frontend
dotenv.config({ path: path.join(__dirname, 'logistica-frontend', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGrover() {
    console.log('--- Checking Grover Orders ---');
    const { data: ordenes, error } = await supabase
        .from('ordenes')
        .select('*, reportes(tecnico_id)')
        .ilike('cliente', '%grover%');
    
    if (error) {
        console.error('Error:', error);
        return;
    }

    ordenes.forEach(o => {
        console.log(`OT: ${o.id_legible} | Cliente: ${o.cliente} | Main Tech ID: ${o.tecnico_id}`);
        console.log(`Report Tech IDs: ${o.reportes.map(r => r.tecnico_id).join(', ')}`);
        console.log('---');
    });

    console.log('--- Checking Daniel ID ---');
    const { data: trab } = await supabase.from('trabajadores').select('*').ilike('nombre', '%daniel%');
    console.log('Daniel Tech Data:', trab);
}

checkGrover();
