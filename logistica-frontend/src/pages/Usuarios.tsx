import { useEffect, useMemo, useRef, useState } from 'react';
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
  created_at: string | null;
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

interface EditProfileOperation { user: ManagedUser; nombre: string; rolId: string; activo: boolean; trabajadorId: string; confirmAssignments: boolean; activeAssignmentsCount: number; }

interface PendingProfileOperation {
  user: ManagedUser;
  rolId: string;
  activo: boolean;
  confirmAdministrator: boolean;
}

interface DeleteTestUserOperation {
  user: ManagedUser;
  confirmationEmail: string;
  confirmSignedInAccount: boolean;
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
  const payload = await result.json().catch(() => ({})) as { error?: string; code?: string; requires_confirmation?: boolean; active_assignments?: number; active_assignments_count?: number } & T;
  if (!result.ok) {
    const error = new Error(payload.error || 'No se pudo completar la operaci\u00f3n.') as Error & { requiresConfirmation?: boolean; activeAssignments?: number };
    error.requiresConfirmation = payload.requires_confirmation === true || payload.code === 'active_assignments_confirmation_required';
    error.activeAssignments = typeof payload.active_assignments_count === 'number' ? payload.active_assignments_count : typeof payload.active_assignments === 'number' ? payload.active_assignments : 0;
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
  const [pendingProfileOperation, setPendingProfileOperation] = useState<PendingProfileOperation | null>(null);
  const [editProfileOperation, setEditProfileOperation] = useState<EditProfileOperation | null>(null);
  const [editConfirmation, setEditConfirmation] = useState<'changes' | 'assignments' | null>(null);
  const [deleteTestUserOperation, setDeleteTestUserOperation] = useState<DeleteTestUserOperation | null>(null);
  const deleteTestUserInFlight = useRef(false);
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

  const openEditProfile = (user: ManagedUser) => { setEditConfirmation(null); setEditProfileOperation({ user, nombre: user.nombre || '', rolId: user.rol_id || '', activo: user.activo, trabajadorId: user.trabajador?.id || '', confirmAssignments: false, activeAssignmentsCount: 0 }); };
  const editHasChanges = (e: EditProfileOperation) => e.nombre.trim() !== (e.user.nombre || '').trim() || e.rolId !== e.user.rol_id || e.activo !== e.user.activo || e.trabajadorId !== (e.user.trabajador?.id || '');
  const submitEditProfile = async (confirmAssignments = false) => { if (!editProfileOperation || savingId) return; const e=editProfileOperation; setSavingId(e.user.auth_user_id); try { await adminRequest('admin-update-user-profile','POST',{target_user_id:e.user.auth_user_id,nombre_completo:e.nombre.trim()||null,rol_id:e.rolId,activo:e.activo,trabajador_id:e.trabajadorId||null,confirm_active_assignments:confirmAssignments}); setEditConfirmation(null); setEditProfileOperation(null); setSuccessMessage('Perfil actualizado correctamente.'); await loadData(); } catch (error) { const message=error instanceof Error?error.message:'No se pudo actualizar el perfil.'; if ((error as Error & { requiresConfirmation?: boolean; activeAssignments?: number }).requiresConfirmation) { setEditProfileOperation({...e,confirmAssignments:true,activeAssignmentsCount:(error as Error & { activeAssignments?: number }).activeAssignments || 0}); setEditConfirmation('assignments'); } else setError(message); } finally { setSavingId(null); } };
  const saveEditProfile = () => { if (!editProfileOperation || savingId || !editHasChanges(editProfileOperation)) return; const e=editProfileOperation; if (!e.rolId) { setError('Debes seleccionar un rol.'); return; } const sensitive=e.rolId!==e.user.rol_id||e.activo!==e.user.activo||e.trabajadorId!==(e.user.trabajador?.id||''); if(sensitive){setEditConfirmation('changes');return;} void submitEditProfile(false); };

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


  const openDeleteTestUser = (user: ManagedUser) => {
    setError(null);
    setDeleteTestUserOperation({ user, confirmationEmail: '', confirmSignedInAccount: false });
  };

  const deleteTestUser = async () => {
    if (!deleteTestUserOperation || savingId || deleteTestUserInFlight.current) return;
    const { user, confirmationEmail, confirmSignedInAccount } = deleteTestUserOperation;
    if (!user.email || confirmationEmail !== user.email) {
      setError('Escribe exactamente el correo de la cuenta para confirmar la eliminaci?n.');
      return;
    }
    if (user.last_access_at && !confirmSignedInAccount) {
      setDeleteTestUserOperation({ ...deleteTestUserOperation, confirmSignedInAccount: true });
      return;
    }
    deleteTestUserInFlight.current = true;
    setSavingId(user.auth_user_id);
    setError(null);
    try {
      await adminRequest('admin-delete-test-user', 'POST', {
        target_user_id: user.auth_user_id,
        confirmation_email: confirmationEmail,
      });
      setDeleteTestUserOperation(null);
      setSuccessMessage('Cuenta de prueba eliminada definitivamente.');
      await loadData();
    } catch (deleteError) {
      console.error('Error deleting test account:', deleteError);
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar la cuenta de prueba.');
    } finally {
      deleteTestUserInFlight.current = false;
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
          <p className="text-xs text-slate-500 self-center">Sin borrado de perfiles, contrase&ntilde;as ni acciones masivas.</p>
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
                  const hasConfiguredName = Boolean(user.nombre?.trim());
                  const emailLocalPart = user.email?.split('@')[0]?.trim();
                  const displayName = isMissingProfile ? 'Sin perfil' : hasConfiguredName ? user.nombre : emailLocalPart || 'Usuario sin nombre';
                  return <tr key={user.auth_user_id} className="align-top hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-5 py-4"><p className="font-bold">{displayName}</p><p className="text-xs text-slate-500">{user.email || 'Sin correo'}</p>{!isMissingProfile && !hasConfiguredName && <p className="mt-1 text-[10px] font-bold text-slate-400">Nombre no configurado</p>}<p className="text-[10px] text-slate-400 font-mono mt-1">{user.auth_user_id}</p>{!hasAuthAccount && <p className="mt-1 text-[10px] font-bold text-rose-600">Perfil sin cuenta Authentication</p>}</td>
                    <td className="px-5 py-4"><span className={`inline-flex px-2 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${ROLE_COLORS[user.rol || ''] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{isMissingProfile ? 'Sin perfil' : user.rol || 'Sin rol'}</span></td>
                    <td className="px-5 py-4"><span className={`text-xs font-black uppercase ${user.activo ? 'text-emerald-600' : 'text-slate-400'}`}>{isMissingProfile ? 'Sin permisos' : user.activo ? 'Activo' : 'Inactivo'}</span></td>
                    <td className="px-5 py-4 text-sm">{isMissingProfile ? 'Crea el perfil antes de vincular trabajador.' : user.trabajador ? `${user.trabajador.nombre} ${user.trabajador.apellidos || ''}` : 'Sin trabajador vinculado'}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">{user.last_access_at ? new Date(user.last_access_at).toLocaleString('es-ES') : 'Nunca'}</td>
                    <td className="px-5 py-4 text-right text-xs">{isSaving ? 'Guardando...' : isMissingProfile && hasAuthAccount ? <div className="flex flex-col items-end gap-2"><button type="button" onClick={() => openCreateProfile(user)} className="rounded-lg bg-primary px-3 py-2 font-black text-white">Crear perfil y configurar acceso</button><button type="button" onClick={() => openDeleteTestUser(user)} className="rounded-lg border border-rose-300 px-3 py-2 font-black text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-300">Eliminar cuenta de prueba</button></div> : isMissingProfile ? 'Cuenta Auth no disponible' : <button type="button" onClick={() => openEditProfile(user)} className="rounded-lg bg-primary px-3 py-2 font-black text-white">Editar perfil</button>}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {editConfirmation && editProfileOperation && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-slate-900"><h3 className="text-lg font-black">Confirmar cambios de perfil</h3><p className="mt-2 text-sm">{editProfileOperation.user.nombre || editProfileOperation.user.email}</p>{editConfirmation === 'assignments' ? <p className="mt-4 text-sm">Este trabajador tiene {editProfileOperation.activeAssignmentsCount} asignaciones activas. El cambio conservará sus asignaciones e historial, pero puede afectar su acceso. ¿Deseas continuar?</p> : <><p className="mt-4 text-sm">Rol: Anterior: {editProfileOperation.user.rol || 'Sin rol'} | Nuevo: {roles.find(r=>r.id===editProfileOperation.rolId)?.nombre || 'Sin rol'}<br/>Estado: Anterior: {editProfileOperation.user.activo?'Activo':'Inactivo'} | Nuevo: {editProfileOperation.activo?'Activo':'Inactivo'}<br/>Trabajador: Anterior: {editProfileOperation.user.trabajador?.nombre || 'Sin trabajador vinculado'} | Nuevo: {availableWorkers.find(w=>w.id===editProfileOperation.trabajadorId)?.nombre || (editProfileOperation.trabajadorId ? editProfileOperation.user.trabajador?.nombre : 'Sin trabajador vinculado')}</p>{(editProfileOperation.user.rol==='Administrador'||roles.find(r=>r.id===editProfileOperation.rolId)?.nombre==='Administrador')&&<p className="mt-3 text-sm font-bold text-amber-700">Este cambio modifica permisos administrativos.</p>}{editProfileOperation.user.activo&&!editProfileOperation.activo&&<p className="mt-3 text-sm">Este usuario perderá el acceso a la aplicación, pero conservará su historial, asignaciones e intervenciones.</p>}{editProfileOperation.trabajadorId!==(editProfileOperation.user.trabajador?.id||'')&&<p className="mt-3 text-sm">El cambio no borrará asignaciones, reportes ni historial.</p>}</>}<div className="mt-6 flex justify-end gap-3"><button disabled={Boolean(savingId)} onClick={()=>setEditConfirmation(null)}>Cancelar</button><button disabled={Boolean(savingId)} onClick={()=>void submitEditProfile(editConfirmation==='assignments')} className="rounded bg-primary px-4 py-2 text-white">Confirmar cambios</button></div></div></div>}
      {editProfileOperation && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-lg rounded-2xl bg-white p-6 dark:bg-slate-900"><h3 className="text-lg font-black">Editar perfil</h3><p className="mt-2 text-sm text-slate-500"><span>{editProfileOperation.user.email || 'Sin correo'}</span><span className="ml-2">Último acceso: {editProfileOperation.user.last_access_at ? new Date(editProfileOperation.user.last_access_at).toLocaleString('es-ES') : 'Nunca'}</span></p><label className="mt-4 block text-xs font-black">Nombre completo</label><input value={editProfileOperation.nombre} maxLength={120} onChange={e=>setEditProfileOperation({...editProfileOperation,nombre:e.target.value})} className="mt-1 w-full rounded border p-2"/><label className="mt-4 block text-xs font-black">Rol</label><select value={editProfileOperation.rolId} onChange={e=>setEditProfileOperation({...editProfileOperation,rolId:e.target.value})} className="mt-1 w-full rounded border p-2"><option value="" disabled>Selecciona un rol</option>{roles.map(r=><option key={r.id} value={r.id}>{r.nombre}</option>)}</select><label className="mt-4 flex gap-2"><input type="checkbox" checked={editProfileOperation.activo} onChange={e=>setEditProfileOperation({...editProfileOperation,activo:e.target.checked})}/> Activo</label><label className="mt-4 block text-xs font-black">Trabajador vinculado</label><select value={editProfileOperation.trabajadorId} onChange={e=>setEditProfileOperation({...editProfileOperation,trabajadorId:e.target.value,confirmAssignments:false})} className="mt-1 w-full rounded border p-2"><option value="">Sin trabajador vinculado</option>{editProfileOperation.user.trabajador && <option value={editProfileOperation.user.trabajador.id}>{editProfileOperation.user.trabajador.nombre} {editProfileOperation.user.trabajador.apellidos || ''}</option>}{availableWorkers.map(w=><option key={w.id} value={w.id}>{w.nombre} {w.apellidos || ''}</option>)}</select>{editProfileOperation.confirmAssignments && <label className="mt-4 flex gap-2 text-sm"><input type="checkbox" checked onChange={()=>{}} readOnly/> Confirmo el cambio de vínculo con asignaciones activas.</label>}<div className="mt-6 flex justify-end gap-3"><button disabled={Boolean(savingId)} onClick={()=>setEditProfileOperation(null)}>Cancelar</button><button disabled={Boolean(savingId)||!editHasChanges(editProfileOperation)} onClick={saveEditProfile} className="rounded bg-primary px-4 py-2 text-white">Guardar cambios</button></div></div></div>}
      {deleteTestUserOperation && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-test-user-title">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
          <h3 id="delete-test-user-title" className="text-lg font-black text-rose-700 dark:text-rose-300">Eliminar cuenta de prueba</h3>
          <p className="mt-3 text-sm">Esta eliminaci?n es definitiva y s?lo est? disponible para cuentas sin perfil, sin trabajador vinculado y sin archivos propios.</p>
          <dl className="mt-4 space-y-2 text-sm"><div><dt className="font-bold">Correo</dt><dd>{deleteTestUserOperation.user.email}</dd></div><div><dt className="font-bold">Fecha de creaci?n</dt><dd>{deleteTestUserOperation.user.created_at ? new Date(deleteTestUserOperation.user.created_at).toLocaleString('es-ES') : 'No disponible'}</dd></div><div><dt className="font-bold">?ltimo acceso</dt><dd>{deleteTestUserOperation.user.last_access_at ? new Date(deleteTestUserOperation.user.last_access_at).toLocaleString('es-ES') : 'Nunca'}</dd></div></dl>
          <label className="mt-5 block text-sm font-bold">Escribe exactamente el correo para confirmar</label>
          <input value={deleteTestUserOperation.confirmationEmail} onChange={(event) => setDeleteTestUserOperation({ ...deleteTestUserOperation, confirmationEmail: event.target.value, confirmSignedInAccount: false })} disabled={Boolean(savingId)} className="mt-2 w-full rounded-lg border border-slate-300 p-2 disabled:opacity-50 dark:border-slate-700" autoComplete="off" />
          {deleteTestUserOperation.user.last_access_at && deleteTestUserOperation.confirmationEmail === deleteTestUserOperation.user.email && !deleteTestUserOperation.confirmSignedInAccount && <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Esta cuenta ha iniciado sesi?n anteriormente. Al continuar se mostrar? una segunda confirmaci?n.</div>}
          {deleteTestUserOperation.user.last_access_at && deleteTestUserOperation.confirmSignedInAccount && <div className="mt-4 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">Confirmaci?n final: esta cuenta tuvo actividad. La eliminaci?n no se puede deshacer.</div>}
          <div className="mt-6 flex justify-end gap-3"><button type="button" disabled={Boolean(savingId)} onClick={() => setDeleteTestUserOperation(null)} className="rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50">Cancelar</button><button type="button" disabled={Boolean(savingId) || deleteTestUserOperation.confirmationEmail !== deleteTestUserOperation.user.email} onClick={() => void deleteTestUser()} className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{deleteTestUserOperation.user.last_access_at && !deleteTestUserOperation.confirmSignedInAccount ? 'Continuar' : 'Eliminar definitivamente'}</button></div>
        </div>
      </div>}
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
    </div>
  );
}

function Summary({ label, value, tone = 'text-slate-900 dark:text-white' }: { label: string; value: number; tone?: string }) {
  return <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</p><p className={`mt-2 text-2xl font-black ${tone}`}>{value}</p></div>;
}
