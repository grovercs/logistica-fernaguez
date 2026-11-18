import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd(), '..');
const modal = readFileSync(resolve(root, 'logistica-frontend/src/components/modals/NuevoReporteModal.tsx'), 'utf8');

// El historial de trabajos previos y la dirección deben limpiarse al abrir el modal.
assert.match(modal, /if \(isOpen\) \{[\s\S]*setOrdenesPrevias\(\[\]\);[\s\S]*setDireccionCliente\(''\);/);

// La selección de un cliente existente debe disparar la carga de trabajos previos.
assert.match(modal, /fetchOrdenesPrevias\(existente\.nombre\);/);

// Si el texto no coincide con un cliente conocido, se deben limpiar datos residuales.
assert.match(modal, /\} else \{[\s\S]*setFormData\(\{[\s\S]*cliente: nombre,[\s\S]*cif_nif: '',[\s\S]*asegurado: '',[\s\S]*telefono_asegurado: '',[\s\S]*email: '',[\s\S]*direccion: '',[\s\S]*direccion_fiscal: '',[\s\S]*\}\);[\s\S]*setDireccionCliente\(''\);[\s\S]*setOrdenesPrevias\(\[\]\);/);

// Debe existir un guarda para descartar respuestas asíncronas desfasadas al cambiar de cliente.
assert.match(modal, /const requestIdRef = useRef\(0\);/);
assert.match(modal, /const currentRequestId = \+\+requestIdRef\.current;/);
assert.match(modal, /if \(data && currentRequestId === requestIdRef\.current\) \{[\s\S]*setOrdenesPrevias\(data\);/);

// La sección de trabajos previos solo debe renderizarse cuando hay un cliente real seleccionado.
assert.match(modal, /\{formData\.cliente && ordenesPrevias\.length > 0 && \(/);

console.log('new order previous works contract tests passed');
