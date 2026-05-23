const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envPath = 'c:/wamp64/www/logisticafernaguez/logistica-frontend/.env.local';
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
            process.env[key.trim()] = value;
        }
    });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
    const { data: roles } = await supabase.from('roles').select('*');
    const admin = roles.find(r => r.nombre === 'Administrador');
    
    if (admin) {
        const { data: links, error } = await supabase.from('permisos_roles').select('*').eq('rol_id', admin.id);
        if (error) {
            console.error('Error fetching links:', error);
        } else {
            console.log(`Verification: Admin has ${links.length} permission links.`);
        }
    } else {
        console.log('Verification: Admin role NOT FOUND.');
    }
}

check().catch(console.error);
