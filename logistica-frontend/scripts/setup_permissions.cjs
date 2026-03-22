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

async function setupPermissions() {
    console.log('Setting up Granular Permissions...');

    // Since we can't run raw SQL, we use JS to check/create if possible
    // or we just trust the tables exist if we created them via a previous migration.
    // However, I'll try to use the REST API to "check" and then I'll assume 
    // the user needs to run the SQL if it fails.
    
    // Actually, I'll try to run a simple 'rpc' if available or just 
    // assume I can insert into them if they exist.
    
    /* 
    SQL to run manually if needed:
    CREATE TABLE permisos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        clave TEXT NOT NULL UNIQUE,
        descripcion TEXT,
        categoria TEXT,
        creado_en TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
    );

    CREATE TABLE permisos_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rol_id UUID REFERENCES roles(id) ON DELETE CASCADE,
        permiso_id UUID REFERENCES permisos(id) ON DELETE CASCADE,
        UNIQUE(rol_id, permiso_id)
    );
    */

    const permissions = [
        "report.list", "report.create", "report.edit", "report.delete", "report.view", "report.calendar", "report.summary", "report.archive", "report.process",
        "user.list", "user.create", "user.edit", "user.delete", "user.password",
        "insured.list", "insured.create", "insured.edit", "insured.delete",
        "worker.list", "worker.create", "worker.edit", "worker.delete",
        "rbac.access", "role.list", "role.create", "role.edit", "role.delete",
        "permission.list", "permission.create", "permission.edit", "permission.delete",
        "assign.roles", "remove.roles", "assign.permissions", "remove.permissions"
    ];

    console.log('Inserting permissions...');
    for (const p of permissions) {
        const [cat] = p.split('.');
        await supabase.from('permisos').upsert({ clave: p, categoria: cat }, { onConflict: 'clave' });
    }

    // Assign all to Administrator
    const { data: adminRole } = await supabase.from('roles').select('id').eq('nombre', 'Administrador').single();
    const { data: allPerms } = await supabase.from('permisos').select('id');

    if (adminRole && allPerms) {
        console.log('Assigning all permissions to Administrator...');
        const assignments = allPerms.map(p => ({ rol_id: adminRole.id, permiso_id: p.id }));
        await supabase.from('permisos_roles').upsert(assignments, { onConflict: 'rol_id,permiso_id' });
    }

    console.log('Permissions setup complete.');
}

setupPermissions().catch(err => {
    console.error('Error setting up permissions. Note: You might need to create the tables manually first.');
    console.error(err);
});
