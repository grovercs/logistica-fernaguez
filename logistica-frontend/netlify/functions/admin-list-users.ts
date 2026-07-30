import type { User } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { isAllowedFunctionRequest, requireActiveAdministrator, response } from './lib/admin-user-utils';

const usersPerPage = 200;
const maxPages = 10_000;

async function listAllAuthUsers(admin: Awaited<ReturnType<typeof requireActiveAdministrator>>['admin']): Promise<User[]> {
  const users: User[] = [];
  const seenIds = new Set<string>();
  for (let page = 1; page <= maxPages; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: usersPerPage });
    if (error) throw new Error('Unable to load authentication users');
    const batch = data.users || [];
    if (batch.length === 0) return users;
    let newUsers = 0;
    for (const user of batch) {
      if (!seenIds.has(user.id)) { seenIds.add(user.id); users.push(user); newUsers += 1; }
    }
    if (batch.length < usersPerPage || newUsers === 0) return users;
  }
  throw new Error('Authentication user pagination limit reached');
}

export const handler: Handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin;
  if (!isAllowedFunctionRequest(event)) return response(403, { error: 'Origin not allowed' });
  if (event.httpMethod === 'OPTIONS') return response(204, {}, origin);
  if (event.httpMethod !== 'GET') return response(405, { error: 'Method not allowed' }, origin);
  try {
    const context = await requireActiveAdministrator(event);
    const [{ data: profiles, error: profilesError }, { data: workers, error: workersError }, authUsers] = await Promise.all([
      context.admin.from('perfiles').select('id, nombre_completo, rol_id, activo, roles(nombre)'),
      context.admin.from('trabajadores').select('id, auth_user_id, nombre, apellidos, estado').order('nombre').order('apellidos'),
      listAllAuthUsers(context.admin),
    ]);
    if (profilesError || workersError) throw new Error('Unable to load user management data');

    const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]));
    const workerByAuthId = new Map((workers || []).filter((worker) => worker.auth_user_id).map((worker) => [worker.auth_user_id, worker]));
    const authUserIds = new Set(authUsers.map((user) => user.id));
    const users = authUsers.map((authUser) => {
      const profile = profileById.get(authUser.id);
      const worker = workerByAuthId.get(authUser.id);
      return {
        auth_user_id: authUser.id, email: authUser.email ?? null, nombre: profile?.nombre_completo ?? null,
        rol_id: profile?.rol_id ?? null, rol: (profile?.roles as { nombre?: string } | null)?.nombre ?? null,
        activo: profile?.activo ?? false, last_access_at: authUser.last_sign_in_at ?? null,
        auth_status: 'active_auth_user', profile_status: profile ? 'active_profile' : 'missing_profile',
        trabajador: worker ? { id: worker.id, nombre: worker.nombre, apellidos: worker.apellidos, estado: worker.estado } : null,
        estado_vinculacion: !profile ? 'sin_perfil' : worker ? 'vinculado' : 'sin_trabajador',
      };
    });
    for (const profile of profiles || []) {
      if (authUserIds.has(profile.id)) continue;
      const worker = workerByAuthId.get(profile.id);
      users.push({
        auth_user_id: profile.id, email: null, nombre: profile.nombre_completo ?? null,
        rol_id: profile.rol_id ?? null, rol: (profile.roles as { nombre?: string } | null)?.nombre ?? null,
        activo: profile.activo ?? false, last_access_at: null,
        auth_status: 'missing_auth_user', profile_status: 'active_profile',
        trabajador: worker ? { id: worker.id, nombre: worker.nombre, apellidos: worker.apellidos, estado: worker.estado } : null,
        estado_vinculacion: worker ? 'vinculado' : 'sin_trabajador',
      });
    }
    const availableWorkers = (workers || []).filter((worker) => !worker.auth_user_id).map((worker) => ({ id: worker.id, nombre: worker.nombre, apellidos: worker.apellidos, estado: worker.estado }));
    return response(200, { users, available_workers: availableWorkers }, origin);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'UNKNOWN';
    if (code === 'UNAUTHORIZED') return response(401, { error: 'Unauthorized' }, origin);
    if (code === 'FORBIDDEN') return response(403, { error: 'Administrator access required' }, origin);
    console.error('admin-list-users failed', code);
    return response(500, { error: 'Unable to load users' }, origin);
  }
};
