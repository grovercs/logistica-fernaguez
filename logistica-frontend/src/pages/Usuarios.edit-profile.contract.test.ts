import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/pages/Usuarios.tsx'), 'utf8');

// Contrato de UI estático: el proyecto no dispone de runner DOM/React.
assert.match(source, /openEditProfile/);
assert.match(source, /setEditProfileOperation\(\{ user, nombre: user\.nombre \|\| '', rolId: user\.rol_id \|\| '', activo: user\.activo, trabajadorId: user\.trabajador\?\.id \|\| ''/);
assert.match(source, /editHasChanges/);
assert.match(source, /disabled=\{Boolean\(savingId\)\|\|!editHasChanges\(editProfileOperation\)\}/);
assert.match(source, /onClick=\{\(\)=>setEditProfileOperation\(null\)\}/);
assert.match(source, /sensitive=e\.rolId!==e\.user\.rol_id\|\|e\.activo!==e\.user\.activo\|\|e\.trabajadorId!==\(e\.user\.trabajador\?\.id\|\|''\)/);
assert.match(source, /setEditConfirmation\('changes'\)/);
assert.match(source, /Este cambio modifica permisos administrativos/);
assert.match(source, /perder\? el acceso|perderá el acceso/);
assert.match(source, /El cambio no borrar\? asignaciones, reportes ni historial|El cambio no borrará asignaciones, reportes ni historial/);
assert.match(source, /active_assignments_confirmation_required/);
assert.match(source, /active_assignments_count/);
assert.match(source, /asignaciones activas/);
assert.match(source, /confirm_active_assignments:confirmAssignments/);
assert.match(source, /isMissingProfile && hasAuthAccount[\s\S]*Crear perfil y configurar acceso/);
assert.match(source, /isMissingProfile \? 'Cuenta Auth no disponible'[\s\S]*Editar perfil/);
assert.doesNotMatch(source, /\.from\('perfiles'\)\.(?:update|insert|delete)/);
assert.doesNotMatch(source, /\.from\('trabajadores'\)\.(?:update|insert|delete)/);
assert.match(source, /isMissingProfile && hasAuthAccount[\s\S]*Eliminar cuenta de prueba/);
assert.match(source, /openDeleteTestUser/);
assert.match(source, /if \(!deleteTestUserOperation \|\| savingId \|\| deleteTestUserInFlight\.current\) return;/);
assert.match(source, /deleteTestUserInFlight\.current = true/);
assert.match(source, /deleteTestUserInFlight\.current = false/);
assert.match(source, /setSavingId\(user\.auth_user_id\)/);
assert.match(source, /setDeleteTestUserOperation\(null\)/);
assert.match(source, /await loadData\(\)/);
assert.match(source, /adminRequest\('admin-delete-test-user', 'POST'/);
assert.match(source, /confirmation_email: confirmationEmail/);
assert.match(source, /Escribe exactamente el correo para confirmar/);
assert.match(source, /Confirmaci?n final: esta cuenta tuvo actividad/);
assert.match(source, /deleteTestUserOperation\.confirmationEmail !== deleteTestUserOperation\.user\.email/);
assert.doesNotMatch(source, /admin-delete-test-user[\s\S]*?supabase\.from\('(?:perfiles|trabajadores)'\)\.(?:update|insert|delete)/);
assert.match(source, /admin-reset-user-password/);
assert.match(source, /newPassword\.length < 10/);
assert.match(source, /newPassword !== confirmPassword/);
assert.match(source, /passwordResetInFlight\.current/);
assert.match(source, /CAMBIAR CONTRASEÑA/);
assert.match(source, /La contraseña se ha actualizado\. El usuario deberá iniciar sesión de nuevo\./);

console.log('Usuarios edit profile UI contract tests passed');
