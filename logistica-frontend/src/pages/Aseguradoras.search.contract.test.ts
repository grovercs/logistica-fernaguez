import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/pages/Aseguradoras.tsx'), 'utf8');

assert.match(source, /const \[searchTerm, setSearchTerm\] = useState\(''\)/);
assert.match(source, /value=\{searchTerm\}/);
assert.match(source, /onChange=\{\(event\) => setSearchTerm\(event\.target\.value\)\}/);
assert.match(source, /normalize\('NFKC'\)\.trim\(\)\.toLocaleLowerCase\('es-ES'\)/);
assert.match(source, /const filteredAseguradoras = normalizedSearchTerm/);
assert.match(source, /\[aseguradora\.nombre, aseguradora\.persona_contacto, aseguradora\.email\]/);
assert.match(source, /normalizeSearchTerm\(value\)\.includes\(normalizedSearchTerm\)/);
assert.match(source, /filteredAseguradoras\.length === 0/);
assert.match(source, /filteredAseguradoras\.map\(aseguradora/);
