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

async function setup() {
    console.log('1. Setting up permissions...');
    const permissions = [
        "report.list", "report.create", "report.edit", "report.delete", "report.view", "report.calendar", "report.summary", "report.archive", "report.process",
        "user.list", "user.create", "user.edit", "user.delete", "user.password",
        "insured.list", "insured.create", "insured.edit", "insured.delete",
        "worker.list", "worker.create", "worker.edit", "worker.delete",
        "rbac.access", "role.list", "role.create", "role.edit", "role.delete",
        "permission.list", "permission.create", "permission.edit", "permission.delete",
        "assign.roles", "remove.roles", "assign.permissions", "remove.permissions"
    ];

    for (const p of permissions) {
        const cat = p.split('.')[0];
        await supabase.from('permisos').upsert({ clave: p, categoria: cat }, { onConflict: 'clave' });
    }

    console.log('2. Setting up roles...');
    const roles = [
        { nombre: 'Administrador', descripcion: 'Acceso total al sistema y gestión de configuración.' },
        { nombre: 'Editor', descripcion: 'Puede crear y editar registros, pero sin permisos de borrado crítico.' },
        { nombre: 'Visualizador', descripcion: 'Acceso de solo lectura para supervisión y reportes.' },
        { nombre: 'Trabajador', descripcion: 'Perfil técnico para la ejecución y reporte de órdenes de trabajo.' }
    ];

    for (const role of roles) {
        await supabase.from('roles').upsert(role, { onConflict: 'nombre' });
    }

    console.log('3. Linking permissions to Administrator...');
    const { data: dbRoles } = await supabase.from('roles').select('id, nombre');
    const { data: dbPerms } = await supabase.from('permisos').select('id, clave');

    const admin = dbRoles.find(r => r.nombre === 'Administrador');
    if (admin && dbPerms) {
        const links = dbPerms.map(p => ({ rol_id: admin.id, permiso_id: p.id }));
        const { error } = await supabase.from('permisos_roles').upsert(links, { onConflict: 'rol_id,permiso_id' });
        if (error) console.error('Error linking:', error);
        else console.log(`Linked ${links.length} permissions to Admin.`);
    }

    console.log('Setup finished.');
}

setup().catch(console.error);
