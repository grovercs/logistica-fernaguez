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

console.log('Usuarios edit profile UI contract tests passed');
