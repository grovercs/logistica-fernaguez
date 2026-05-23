const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Simple manual .env parser
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

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncRoles() {
    console.log('Syncing roles (Final CJS)...');

    // 1. Rename Técnico to Trabajador if it exists
    const { data: tecnicoRole } = await supabase
        .from('roles')
        .select('*')
        .eq('nombre', 'Técnico')
        .maybeSingle();

    if (tecnicoRole) {
        console.log('Renaming Técnico to Trabajador...');
        await supabase
            .from('roles')
            .update({ nombre: 'Trabajador' })
            .eq('id', tecnicoRole.id);
    }

    // 2. Add Editor, Visualizador, and ensure Trabajador exists
    const rolesToAdd = [
        { nombre: 'Editor', descripcion: 'Puede crear, modificar y eliminar registros en liquidaciones y reportes.' },
        { nombre: 'Visualizador', descripcion: 'Acceso restringido únicamente para consulta de reportes y tableros.' },
        { nombre: 'Trabajador', descripcion: 'Acceso a perfil propio, marcaciones y gestión de tareas personales.' },
        { nombre: 'Administrador', descripcion: 'Control total sobre todos los módulos, ajustes y bases de datos.' }
    ];

    for (const role of rolesToAdd) {
        const { data: existing } = await supabase
            .from('roles')
            .select('*')
            .eq('nombre', role.nombre)
            .maybeSingle();

        if (!existing) {
            console.log(`Adding role: ${role.nombre}`);
            await supabase.from('roles').insert(role);
        } else {
            console.log(`Role already exists: ${role.nombre}`);
            await supabase.from('roles').update({ descripcion: role.descripcion }).eq('id', existing.id);
        }
    }

    console.log('Roles synced successfully.');
}

syncRoles().catch(console.error);
