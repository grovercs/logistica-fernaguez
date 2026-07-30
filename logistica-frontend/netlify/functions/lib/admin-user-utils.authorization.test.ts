import assert from 'node:assert/strict';
import { validateActiveAdministrator, type AdminAuthorizationDependencies } from './admin-user-utils';

const userId = '12345678-1234-4123-8123-123456789abc';
const dependencies = (overrides: Partial<AdminAuthorizationDependencies> = {}): AdminAuthorizationDependencies => ({
  supabaseUrlHost: 'project.supabase.co',
  getAuthenticatedUser: async () => ({ userId, errorCode: null }),
  getProfile: async () => ({ profile: { id: userId, rol_id: '87654321-1234-4123-8123-123456789abc', activo: true }, errorCode: null }),
  getRoleName: async () => ({ roleName: 'Administrador', errorCode: null }),
  ...overrides,
});

async function run() {
  assert.equal(await validateActiveAdministrator('token', dependencies()), userId);
  await assert.rejects(() => validateActiveAdministrator('token', dependencies({ getRoleName: async () => ({ roleName: 'Trabajador', errorCode: null }) })), /FORBIDDEN/);
  await assert.rejects(() => validateActiveAdministrator('token', dependencies({ getProfile: async () => ({ profile: { id: userId, rol_id: '87654321-1234-4123-8123-123456789abc', activo: false }, errorCode: null }) })), /FORBIDDEN/);
  await assert.rejects(() => validateActiveAdministrator('token', dependencies({ getProfile: async () => ({ profile: null, errorCode: null }) })), /FORBIDDEN/);
  await assert.rejects(() => validateActiveAdministrator('token', dependencies({ getProfile: async () => ({ profile: null, errorCode: 'PGRST999' }) })), /ADMIN_PROFILE_LOOKUP_ERROR/);
  await assert.rejects(() => validateActiveAdministrator('token', dependencies({ getAuthenticatedUser: async () => ({ userId: null, errorCode: 'invalid_jwt' }) })), /UNAUTHORIZED/);
  console.log('admin authorization tests passed');
}

run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
