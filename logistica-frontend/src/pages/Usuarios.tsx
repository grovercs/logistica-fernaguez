import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Role {
  id: string;
  nombre: string;
}

interface WorkerOption {
  id: string;
  nombre: string;
  apellidos: string | null;
  estado: string | null;
}

interface ManagedUser {
  auth_user_id: string;
  email: string | null;
  nombre: string | null;
  rol_id: string | null;
  rol: string | null;
  activo: boolean;
  last_access_at: string | null;
  trabajador: WorkerOption | null;
  estado_vinculacion: 'vinculado' | 'sin_trabajador' | 'sin_perfil';
  auth_status: 'active_auth_user' | 'missing_auth_user';
  profile_status: 'active_profile' | 'missing_profile';
}

interface UserListResponse {
  users: ManagedUser[];
  available_workers: WorkerOption[];
}

interface PendingLinkOperation {
  user: ManagedUser;
  trabajadorId: string | null;
  operation: 'vincular' | 'desvincular';
  activeAssignments: number;
}

interface PendingProfileOperation {
  user: ManagedUser;
  rolId: string;
  activo: boolean;
  confirmAdministrator: boolean;
}

const ROLE_COLORS: Record<string, string> = {
  Administrador: 'bg-primary/10 text-primary border-primary/20',
  Editor: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
  Trabajador: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
  Visualizador: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-500/30',
};

async function adminRequest<T>(path: string, method: 'GET' | 'POST', body?: unknown): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('La sesi\u00f3n ha caducado. Inicia sesi\u00f3n de nuevo.');
  const result = await fetch(`/.netlify/functions/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await result.json().catch(() => ({})) as { error?: string; requires_confirmation?: boolean; active_assignments?: number } & T;
  if (!result.ok) {
    const error = new Error(payload.error || 'No se pudo completar la operaci\u00f3n.') as Error & { requiresConfirmation?: boolean; activeAssignments?: number };
    error.requiresConfirmation = payload.requires_confirmation === true;
    error.activeAssignments = typeof payload.active_assignments === 'number' ? payload.active_assignments : 0;
    throw error;
  }
  return payload;
}

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<ManagedUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [availableWorkers, setAvailableWorkers] = useState<WorkerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [linkingUserId, setLinkingUserId] = useState<string | null>(null);
  const [pendingLinkOperation, setPendingLinkOperation] = useState<PendingLinkOperation | null>(null);
  const [pendingProfileOperation, setPendingProfileOperation] = useState<PendingProfileOperation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: rolesData, error: rolesError }, list] = await Promise.all([
        // El cat?logo solo alimenta el selector: Functions y RPC validan de nuevo toda autorizaci?n.
        supabase.from('roles').select('id, nombre').order('nombre'),
        adminRequest<UserListResponse>('admin-list-users', 'GET'),
      ]);
      if (rolesError) throw rolesError;
      setRoles(rolesData || []);
      setUsuarios(list.users || []);
      setAvailableWorkers(list.available_workers || []);
    } catch (loadError) {
      console.error('Error loading secure user management data:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los usuarios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredUsuarios = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return usuarios;
    return usuarios.filter((user) => [user.nombre, user.email, user.rol, user.trabajador?.nombre, user.trabajador?.apellidos]
      .some((value) => value?.toLowerCase().includes(term)));
  }, [searchTerm, usuarios]);

  const updateAccess = async (user: ManagedUser, changes: { rol_id?: string; activo?: boolean }) => {
    const changingAdministrator = user.rol === 'Administrador' && (changes.rol_id !== undefined || changes.activo === false);
    if (changingAdministrator && !window.confirm('Vas a cambiar o desactivar una cuenta Administrador. Confirma que quedar\u00e1 otro Administrador activo.')) return;
    setSavingId(user.auth_user_id);
    setError(null);
    try {
      await adminRequest('admin-update-user-access', 'POST', { target_user_id: user.auth_user_id, ...changes });
      await loadData();
    } catch (updateError) {
      console.error('Error updating user access:', updateError);
      setError(updateError instanceof Error ? updateError.message : 'No se pudo actualizar el acceso.');
    } finally {
      setSavingId(null);
    }
  };

  const linkWorker = async (user: ManagedUser, workerId: string | null, confirmActiveAssignments = false) => {
    setSavingId(user.auth_user_id);
    setError(null);
    try {
      await adminRequest('admin-link-user-worker', 'POST', {
        target_user_id: user.auth_user_id,
        trabajador_id: workerId,
        confirm_active_assignments: confirmActiveAssignments,
      });
      setLinkingUserId(null);
      setPendingLinkOperation(null);
      setSuccessMessage(workerId ? 'Cuenta vinculada al trabajador correctamente.' : 'Cuenta desvinculada del trabajador correctamente.');
      await loadData();
    } catch (linkError) {
      const confirmationError = linkError as Error & { requiresConfirmation?: boolean; activeAssignments?: number };
      if (confirmationError.requiresConfirmation) {
        setPendingLinkOperation({
          user,
          trabajadorId: workerId,
          operation: workerId ? 'vincular' : 'desvincular',
          activeAssignments: confirmationError.activeAssignments || 0,
        });
        return;
      }
      console.error('Error linking worker:', linkError);
      setError(linkError instanceof Error ? linkError.message : 'No se pudo actualizar el v\u00ednculo.');
    } finally {
      setSavingId(null);
    }
  };

  const confirmPendingLinkOperation = async () => {
    if (!pendingLinkOperation || savingId) return;
    await linkWorker(pendingLinkOperation.user, pendingLinkOperation.trabajadorId, true);
  };

  const openCreateProfile = (user: ManagedUser) => {
    if (roles.length === 0) {
      setError('No hay roles disponibles para crear el perfil.');
      return;
    }
    setPendingProfileOperation({ user, rolId: '', activo: true, confirmAdministrator: false });
  };

  const createUserProfile = async () => {
    if (!pendingProfileOperation || savingId) return;
    if (!pendingProfileOperation.rolId) {
      setError('Debes seleccionar un rol.');
      return;
    }
    const { user, rolId, activo } = pendingProfileOperation;
    const selectedRole = roles.find((role) => role.id === rolId);
    if (selectedRole?.nombre === 'Administrador' && !pendingProfileOperation.confirmAdministrator) {
      setError('Confirma expresamente la creación de una cuenta Administrador.');
      return;
    }
    setSavingId(user.auth_user_id);
    setError(null);
    try {
      await adminRequest('admin-create-user-profile', 'POST', {
        target_user_id: user.auth_user_id,
        rol_id: rolId,
        activo,
      });
      setPendingProfileOperation(null);
      setSuccessMessage('Perfil creado correctamente. Ya puedes vincular la cuenta a un trabajador.');
      await loadData();
    } catch (createError) {
      console.error('Error creating user profile:', createError);
      setError(createError instanceof Error ? createError.message : 'No se pudo crear el perfil.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 h-full">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 w-full backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-8 py-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight">Gesti&oacute;n de Usuarios</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Accesos y v&iacute;nculos gestionados de forma segura por Administradores.</p>
          </div>
          <button onClick={() => void loadData()} disabled={loading} className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 disabled:opacity-50">
            Actualizar
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
        {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex justify-between gap-4"><span>{error}</span><button onClick={() => setError(null)} aria-label="Cerrar error">&times;</button></div>}
        {successMessage && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex justify-between gap-4"><span>{successMessage}</span><button onClick={() => setSuccessMessage(null)} aria-label="Cerrar confirmaci?n">&times;</button></div>}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative w-full max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar por nombre, correo, rol o trabajador..." className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <p className="text-xs text-slate-500 self-center">Sin borrado de cuentas, contrase&ntilde;as ni acciones masivas.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Summary label="Usuarios" value={usuarios.length} />
          <Summary label="Activos" value={usuarios.filter((user) => user.activo).length} tone="text-emerald-600" />
          <Summary label="Sin trabajador vinculado" value={usuarios.filter((user) => user.estado_vinculacion === 'sin_trabajador').length} tone="text-amber-600" />
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <tr><th className="px-5 py-4">Usuario</th><th className="px-5 py-4">Rol real</th><th className="px-5 py-4">Estado</th><th className="px-5 py-4">Trabajador vinculado</th><th className="px-5 py-4">&Uacute;ltimo acceso</th><th className="px-5 py-4 text-right">Acciones</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? <tr><td colSpan={6} className="px-6 py-14 text-center text-slate-500 font-bold animate-pulse">Cargando usuarios...</td></tr> : filteredUsuarios.length === 0 ? <tr><td colSpan={6} className="px-6 py-14 text-center text-slate-400">No se encontraron usuarios.</td></tr> : filteredUsuarios.map((user) => {
                  const isSaving = savingId === user.auth_user_id;
                  const hasAuthAccount = user.auth_status === 'active_auth_user';
                  const isMissingProfile = user.profile_status === 'missing_profile';
                  return <tr key={user.auth_user_id} className="align-top hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-5 py-4"><p className="font-bold">{user.nombre || 'Sin perfil'}</p><p className="text-xs text-slate-500">{user.email || 'Sin correo'}</p><p className="text-[10px] text-slate-400 font-mono mt-1">{user.auth_user_id}</p>{!hasAuthAccount && <p className="mt-1 text-[10px] font-bold text-rose-600">Perfil sin cuenta Authentication</p>}</td>
                    <td className="px-5 py-4">{isMissingProfile ? <p className="text-xs font-bold text-amber-600">Sin perfil ni rol</p> : <><label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rol</label><span className={`mt-1 inline-flex px-2 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${ROLE_COLORS[user.rol || ''] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{user.rol || 'Sin rol'}</span><select disabled={isSaving || !hasAuthAccount} value={user.rol_id || ''} onChange={(event) => void updateAccess(user, { rol_id: event.target.value })} className="mt-2 block w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs disabled:opacity-50"><option value="" disabled>Sin rol</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.nombre}</option>)}</select></>}</td>
                    <td className="px-5 py-4">{isMissingProfile ? <p className="text-xs text-slate-500">Sin permisos todavía</p> : <><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Activar/Desactivar</p><button disabled={isSaving || !hasAuthAccount} onClick={() => void updateAccess(user, { activo: !user.activo })} className={`mt-1 inline-flex items-center gap-2 text-xs font-black uppercase ${user.activo ? 'text-emerald-600' : 'text-slate-400'} disabled:opacity-50`}><span className={`size-2 rounded-full ${user.activo ? 'bg-emerald-500' : 'bg-slate-400'}`} />{user.activo ? 'Activo' : 'Inactivo'}</button></>}</td>
                    <td className="px-5 py-4">{isMissingProfile ? <p className="text-xs text-slate-500">Crea el perfil antes de vincular trabajador.</p> : user.trabajador ? <><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Desvincular trabajador</p><p className="mt-1 text-sm font-bold">{user.trabajador.nombre} {user.trabajador.apellidos || ''}</p><p className="text-xs text-slate-500">{user.trabajador.estado || 'Sin estado'}</p><button disabled={isSaving || !hasAuthAccount} onClick={() => void linkWorker(user, null)} className="mt-2 text-xs font-bold text-rose-600 hover:underline disabled:opacity-50">Desvincular trabajador</button></> : <><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vincular trabajador</p><span className="mt-1 block text-xs text-amber-600 font-bold">Sin trabajador</span><button disabled={isSaving || !hasAuthAccount} onClick={() => setLinkingUserId(linkingUserId === user.auth_user_id ? null : user.auth_user_id)} className="block mt-2 text-xs font-bold text-primary hover:underline disabled:opacity-50">Vincular trabajador</button>{linkingUserId === user.auth_user_id && <select defaultValue="" disabled={isSaving} onChange={(event) => { if (event.target.value) void linkWorker(user, event.target.value); }} className="mt-2 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs disabled:opacity-50"><option value="">Selecciona trabajador...</option>{availableWorkers.map((worker) => <option key={worker.id} value={worker.id}>{worker.nombre} {worker.apellidos || ''} &mdash; {worker.estado || 'Sin estado'}</option>)}</select>}</>}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">{user.last_access_at ? new Date(user.last_access_at).toLocaleString('es-ES') : 'Nunca'}</td>
                    <td className="px-5 py-4 text-right text-xs">{isSaving ? <span className="text-slate-400">Guardando...</span> : isMissingProfile && hasAuthAccount ? <button type="button" onClick={() => openCreateProfile(user)} disabled={roles.length === 0} className="rounded-lg bg-primary px-3 py-2 text-xs font-black text-white hover:opacity-90 disabled:opacity-50">Crear perfil y configurar acceso</button> : isMissingProfile ? <span className="text-slate-400">Cuenta Auth no disponible</span> : <span className="text-slate-500">Los cambios se guardan al modificar el rol o pulsar el estado.</span>}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {pendingProfileOperation && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="create-profile-title">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
          <h3 id="create-profile-title" className="text-lg font-black">Crear perfil y configurar acceso</h3>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Se creará un perfil para <strong>{pendingProfileOperation.user.email || pendingProfileOperation.user.auth_user_id}</strong>. Después de crear el perfil podrás vincular esta cuenta a un trabajador.</p>
          <label className="mt-5 block text-xs font-black uppercase tracking-widest text-slate-500">Rol</label>
          <select value={pendingProfileOperation.rolId} disabled={savingId === pendingProfileOperation.user.auth_user_id} onChange={(event) => setPendingProfileOperation({ ...pendingProfileOperation, rolId: event.target.value, confirmAdministrator: false })} className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800">
            <option value="" disabled>Selecciona un rol...</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.nombre}</option>)}
          </select>
          {roles.find((role) => role.id === pendingProfileOperation.rolId)?.nombre === 'Administrador' && <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><p className="font-black">Advertencia: acceso Administrador</p><p className="mt-1">Esta cuenta podrá gestionar usuarios y datos administrativos.</p><label className="mt-3 flex items-start gap-2 font-bold"><input type="checkbox" checked={pendingProfileOperation.confirmAdministrator} disabled={savingId === pendingProfileOperation.user.auth_user_id} onChange={(event) => setPendingProfileOperation({ ...pendingProfileOperation, confirmAdministrator: event.target.checked })} /> Confirmo que deseo crear una cuenta Administrador.</label></div>}
          <label className="mt-4 flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={pendingProfileOperation.activo} disabled={savingId === pendingProfileOperation.user.auth_user_id} onChange={(event) => setPendingProfileOperation({ ...pendingProfileOperation, activo: event.target.checked })} /> Activar acceso al crear el perfil</label>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" disabled={savingId === pendingProfileOperation.user.auth_user_id} onClick={() => setPendingProfileOperation(null)} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 disabled:opacity-50 dark:text-slate-300">Cancelar</button>
            <button type="button" disabled={savingId === pendingProfileOperation.user.auth_user_id || !pendingProfileOperation.rolId || (roles.find((role) => role.id === pendingProfileOperation.rolId)?.nombre === 'Administrador' && !pendingProfileOperation.confirmAdministrator)} onClick={() => void createUserProfile()} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{savingId === pendingProfileOperation.user.auth_user_id ? 'Creando...' : 'Crear perfil'}</button>
          </div>
        </div>
      </div>}
      {pendingLinkOperation && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="link-confirmation-title">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
          <h3 id="link-confirmation-title" className="text-lg font-black">Confirmar {pendingLinkOperation.operation}</h3>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            {pendingLinkOperation.operation === 'vincular'
              ? `El trabajador seleccionado tiene ${pendingLinkOperation.activeAssignments} asignaciones activas. \u00bfDeseas vincular esta cuenta igualmente?`
              : `Este trabajador tiene ${pendingLinkOperation.activeAssignments} asignaciones activas. Si desvinculas la cuenta, conservar\u00e1 sus asignaciones e historial, pero dejar\u00e1 de poder acceder como ese trabajador. \u00bfDeseas continuar?`}
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" disabled={savingId === pendingLinkOperation.user.auth_user_id} onClick={() => setPendingLinkOperation(null)} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 disabled:opacity-50 dark:text-slate-300">Cancelar</button>
            <button type="button" disabled={savingId === pendingLinkOperation.user.auth_user_id} onClick={() => void confirmPendingLinkOperation()} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{savingId === pendingLinkOperation.user.auth_user_id ? 'Procesando...' : 'Confirmar'}</button>
          </div>
        </div>
      </div>}
    </div>
  );
}

function Summary({ label, value, tone = 'text-slate-900 dark:text-white' }: { label: string; value: number; tone?: string }) {
  return <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</p><p className={`mt-2 text-2xl font-black ${tone}`}>{value}</p></div>;
}
