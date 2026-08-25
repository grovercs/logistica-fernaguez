import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const source = readFileSync(
  resolve(__dirname, '../../../../supabase/migrations/20260824_add_admin_order_delete_audit.sql'),
  'utf8',
);

const ordenesSource = readFileSync(
  resolve(__dirname, '../../../src/pages/Ordenes.tsx'),
  'utf8',
);

const detalleSource = readFileSync(
  resolve(__dirname, '../../../src/pages/OrdenDetalle.tsx'),
  'utf8',
);

// 1. Migración crea tabla de auditoría con estructura correcta y sin FK a auth.users
assert.match(source, /CREATE TABLE IF NOT EXISTS public\.admin_order_audit_log/);
assert.match(source, /actor_user_id uuid NULL/);
assert.doesNotMatch(source, /actor_user_id uuid (?:NOT NULL )?REFERENCES auth\.users\(id\)/);
assert.match(source, /target_order_id uuid NULL/);
assert.match(source, /db_session_user text NOT NULL/);
assert.match(source, /actor_name text NULL/);
assert.match(source, /actor_email text NULL/);
assert.match(source, /actor_role text NULL/);
assert.match(source, /action text NOT NULL CHECK \(action IN \('hard_delete_order', 'empty_trash', 'direct_delete'\)\)/);
assert.match(source, /old_values jsonb NOT NULL/);
assert.match(source, /success boolean NOT NULL/);
assert.match(source, /deleted_at timestamptz NOT NULL DEFAULT now\(\)/);

// 2. RLS y permisos restringidos sobre auditoría
assert.match(source, /ALTER TABLE public\.admin_order_audit_log ENABLE ROW LEVEL SECURITY/);
assert.match(source, /CREATE POLICY "Administradores leen auditoria de obras"/);
assert.match(source, /REVOKE ALL PRIVILEGES ON TABLE public\.admin_order_audit_log FROM authenticated/);
assert.match(source, /GRANT SELECT ON TABLE public\.admin_order_audit_log TO authenticated/);
assert.doesNotMatch(source, /GRANT INSERT ON TABLE public\.admin_order_audit_log TO authenticated/);
assert.doesNotMatch(source, /GRANT UPDATE ON TABLE public\.admin_order_audit_log TO authenticated/);
assert.doesNotMatch(source, /GRANT DELETE ON TABLE public\.admin_order_audit_log TO authenticated/);

// 3. Cierre del DELETE directo sobre ordenes a PUBLIC, anon y authenticated
assert.match(source, /REVOKE DELETE ON TABLE public\.ordenes FROM PUBLIC/);
assert.match(source, /REVOKE DELETE ON TABLE public\.ordenes FROM anon/);
assert.match(source, /REVOKE DELETE ON TABLE public\.ordenes FROM authenticated/);

// 4. Trigger universal de auditoría: BEFORE DELETE FOR EACH ROW, no bloqueo
assert.match(source, /CREATE OR REPLACE FUNCTION private\.trg_audit_order_delete\(\)/);
assert.match(source, /BEFORE DELETE ON public\.ordenes/);
assert.match(source, /FOR EACH ROW/);
assert.match(source, /trg_ordenes_audit_delete/);

// 5. El trigger inserta en auditoría; la RPC no
const triggerFuncMatch = source.match(
  /CREATE OR REPLACE FUNCTION private\.trg_audit_order_delete\(\)[\s\S]*?\$\$;/,
);
assert.ok(triggerFuncMatch, 'trigger function block found');
assert.match(
  triggerFuncMatch[0],
  /INSERT INTO public\.admin_order_audit_log/,
  'trigger function must insert audit rows',
);
assert.doesNotMatch(
  triggerFuncMatch[0],
  /RAISE EXCEPTION 'DIRECT_DELETE_FORBIDDEN'/,
  'trigger function must not block direct deletes',
);

const rpcFuncMatch = source.match(
  /CREATE OR REPLACE FUNCTION public\.admin_eliminar_ordenes\([\s\S]*?\$\$;/,
);
assert.ok(rpcFuncMatch, 'RPC function block found');
assert.doesNotMatch(
  rpcFuncMatch[0],
  /INSERT INTO public\.admin_order_audit_log/,
  'RPC function must not insert audit rows directly',
);

// 6. Función pública de borrado con seguridad adecuada y separación de firmas
assert.match(source, /CREATE OR REPLACE FUNCTION public\.admin_eliminar_ordenes\(/);
assert.match(source, /RETURNS TABLE \(/);
assert.match(source, /deleted_count integer/);
assert.match(source, /media_urls text\[\]/);
assert.match(source, /firma_urls text\[\]/);
assert.match(source, /SECURITY DEFINER/);
assert.match(source, /SET search_path = ''/);
assert.match(source, /v_actor := auth\.uid\(\)/);
assert.match(source, /IF v_actor IS NULL/);
assert.match(source, /ADMINISTRATOR_REQUIRED/);
assert.match(source, /ORDERS_NOT_IN_TRASH/);
assert.match(source, /ORDERS_BLOCKED_BY_LIQUIDACIONES/);
assert.match(source, /FOR UPDATE/);

// 7. La RPC establece contexto transaccional para el trigger, no desactiva auditoría
assert.match(source, /set_config\('app\.audit\.actor_user_id', v_actor::text, true\)/);
assert.match(source, /set_config\('app\.audit\.action', p_action, true\)/);
assert.match(source, /set_config\('app\.audit\.reason', p_reason, true\)/);
assert.doesNotMatch(rpcFuncMatch[0], /set_config\('app\.allow_order_delete'/);

// 8. Permisos de la función RPC: authenticated sí, anon no
assert.match(source, /GRANT EXECUTE ON FUNCTION public\.admin_eliminar_ordenes\(uuid\[\], text, text\)\s+TO authenticated/);
assert.match(source, /REVOKE EXECUTE ON FUNCTION public\.admin_eliminar_ordenes\(uuid\[\], text, text\)\s+FROM anon/);

// 9. Snapshot completo en el trigger y borrado en cascada desde la RPC
assert.match(triggerFuncMatch[0], /'orden', pg_catalog\.to_jsonb\(OLD\)/);
assert.match(triggerFuncMatch[0], /'reportes', v_reportes/);
assert.match(triggerFuncMatch[0], /'asignaciones', v_asignaciones/);
assert.match(rpcFuncMatch[0], /DELETE FROM public\.ordenes\s+WHERE id = ANY\(p_order_ids\)/);

// 10. Contract tests estáticos dentro de la migración
assert.match(source, /CONTRACT_FAIL: no existe public\.admin_order_audit_log/);
assert.match(source, /CONTRACT_FAIL: RLS no está habilitado en public\.admin_order_audit_log/);
assert.match(source, /CONTRACT_FAIL: actor_user_id tiene FK hacia auth\.users/);
assert.match(source, /CONTRACT_FAIL: authenticated tiene DELETE directo sobre public\.ordenes/);
assert.match(source, /CONTRACT_FAIL: admin_eliminar_ordenes no es SECURITY DEFINER/);
assert.match(source, /CONTRACT_FAIL: admin_eliminar_ordenes no fuerza search_path=/);
assert.match(source, /CONTRACT_FAIL: anon puede ejecutar admin_eliminar_ordenes/);
assert.match(source, /CONTRACT_FAIL: el trigger no inserta en public\.admin_order_audit_log/);
assert.match(source, /CONTRACT_FAIL: admin_eliminar_ordenes inserta directamente en auditoría/);
assert.match(source, /CONTRACT_FAIL: admin_eliminar_ordenes puede desactivar la auditoría/);
assert.match(source, /CONTRACT_FAIL: el trigger de auditoría no es FOR EACH ROW/);
assert.match(source, /CONTRACT_FAIL: falta CHECK de action con direct_delete/);

// 11. Frontend usa la RPC, restringe el botón a administradores y lee data[0]
assert.match(ordenesSource, /supabase\.rpc\('admin_eliminar_ordenes'/);
assert.match(ordenesSource, /p_action: 'empty_trash'/);
assert.match(ordenesSource, /p_action: 'hard_delete_order'/);
assert.match(ordenesSource, /data\?\.\[0\]/);
assert.match(ordenesSource, /media_urls/);
assert.match(ordenesSource, /firma_urls/);
assert.match(ordenesSource, /isAdmin && \(/);
assert.match(ordenesSource, /activeTab === 'papelera' && filteredOrdenes\.length > 0 && isAdmin && \(/);
assert.doesNotMatch(ordenesSource, /activeTab === 'papelera' && filteredOrdenes\.length > 0 && isEditor && \(/);

// 12. OrdenDetalle también usa la RPC, separa firmas y restringe el borrado permanente
assert.match(detalleSource, /supabase\.rpc\('admin_eliminar_ordenes'/);
assert.match(detalleSource, /p_action: 'hard_delete_order'/);
assert.match(detalleSource, /data\?\.\[0\]/);
assert.match(detalleSource, /media_urls/);
assert.match(detalleSource, /firma_urls/);
assert.match(detalleSource, /isAdmin && \(/);

console.log('admin delete order contract tests passed');
