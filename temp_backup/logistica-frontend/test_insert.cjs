const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envText = fs.readFileSync('.env.local', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
        env[match[1]] = match[2];
    }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function check() {
    console.log("Checking trabajadores...");
    const t = await supabase.from('trabajadores').select('*').limit(1);
    console.log("Trabajadores:", t.data, t.error);

    console.log("Checking aseguradoras...");
    const a = await supabase.from('aseguradoras').select('*').limit(1);
    console.log("Aseguradoras:", a.data, a.error);
}

check();
