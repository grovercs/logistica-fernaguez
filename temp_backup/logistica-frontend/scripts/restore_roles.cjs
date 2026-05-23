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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function restoreDefaults() {
    console.log('Restoring Default Roles...');

    const defaultRoles = [
        { nombre: 'Administrador', descripcion: 'Acceso total al sistema y gestión de configuración.' },
        { nombre: 'Editor', descripcion: 'Puede crear y editar registros, pero sin permisos de borrado crítico.' },
        { nombre: 'Visualizador', descripcion: 'Acceso de solo lectura para supervisión y reportes.' },
        { nombre: 'Trabajador', descripcion: 'Perfil técnico para la ejecución y reporte de órdenes de trabajo.' }
    ];

    for (const role of defaultRoles) {
        console.log(`Checking/Creating role: ${role.nombre}`);
        await supabase.from('roles').upsert(role, { onConflict: 'nombre' });
    }

    console.log('Fetching roles and permissions to link...');
    const { data: roles } = await supabase.from('roles').select('id, nombre');
    const { data: perms } = await supabase.from('permisos').select('id, clave');

    const adminRole = roles.find(r => r.nombre === 'Administrador');
    
    if (adminRole && perms) {
        console.log('Linking ALL permissions to Administrador...');
        const assignments = perms.map(p => ({
            rol_id: adminRole.id,
            permiso_id: p.id
        }));
        await supabase.from('permisos_roles').upsert(assignments, { onConflict: 'rol_id,permiso_id' });
    }

    console.log('Role restoration complete.');
}

restoreDefaults().catch(console.error);
