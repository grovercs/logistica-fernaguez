import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/pages/BackupCenter.tsx'), 'utf8');

assert.match(source, /in\('estado', \['Finalizada', 'Finalizado'\]\)/);
assert.match(source, /eq\('estado', 'Archivado'\)/);
assert.match(source, /rpc\('admin_archive_orders', \{ p_order_ids: orderIds \}\)/);
assert.match(source, /selectedArchiveIds/);
assert.match(source, /toggleAllArchiveOrders/);
assert.match(source, /ARCHIVAR \{selectedArchiveIds\.size\} SELECCIONADAS/);
assert.match(source, /rpc\('admin_restore_order', \{ p_order_id: orderId \}\)/);
assert.match(source, /RESTAURAR/);
assert.match(source, /VER DETALLE/);
assert.match(source, /Resumen de Obra Histórica/);
assert.match(source, /loadHistoricalOrderDetail/);
assert.match(source, /\.eq\('orden_id', order\.id\)/);
assert.match(source, /\.eq\('orden_id', order\.id_legible\)/);
assert.match(source, /from\('perfiles'\)\.select\('id, nombre_completo'\)/);
assert.match(source, /setSelectedHistoricalOrder\(null\)/);
assert.doesNotMatch(source, /compactado/);
assert.doesNotMatch(source, /from\('ordenes'\)\.update\(\{ estado: restoredState/);
assert.doesNotMatch(source, /from\('ordenes'\)\.update\(/);
