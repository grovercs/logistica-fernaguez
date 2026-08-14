import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/pages/OrdenDetalle.tsx'), 'utf8');

assert.match(source, /\{orden\.nombre_obra && \([\s\S]*\{orden\.nombre_obra\}/);
assert.match(source, /uppercase tracking-wider">Cliente<\/label>[\s\S]*\{orden\.cliente\}/);
assert.match(source, /normalizeComparableText\(legacyCompany\) !== normalizeComparableText\(orden\.cliente\)/);
assert.match(source, /\{showLegacyCompany && \(/);
assert.match(source, /uppercase tracking-wider">Referencia<\/label>[\s\S]*\{orden\.poliza \|\| '-'\}/);
assert.doesNotMatch(source, />yes<\/span>/i);
assert.match(source, /const showOtherOrders = Boolean\(otherOrders && otherOrders !== '-'\)/);
assert.match(source, /\{showOtherOrders && \([\s\S]*Otras Órdenes \/ Notas[\s\S]*\{otherOrders\}/);

console.log('order detail display contract tests passed');
