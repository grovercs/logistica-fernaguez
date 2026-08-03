import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/pages/Liquidaciones.tsx'), 'utf8');

// Contract tests: the project has no React DOM test runner. These assertions protect
// the accounting-date path from regressing to the report audit timestamp.
assert.match(source, /fecha_trabajo: string \| null;/);
assert.match(source, /fecha_trabajo: row\.fecha_trabajo/);
assert.match(source, /if \(desde && \(!r\.fecha_trabajo \|\| r\.fecha_trabajo < desde\)\) return false;/);
assert.match(source, /if \(hasta && \(!r\.fecha_trabajo \|\| r\.fecha_trabajo > hasta\)\) return false;/);
assert.match(source, /\.sort\(sortByWorkDateDesc\)/);
assert.match(source, /const byObra = useMemo\([\s\S]*?filtered\.forEach/);
assert.match(source, /const byWorker = useMemo\([\s\S]*?filtered\.forEach/);
assert.match(source, /const totalHoras = filtered\.reduce/);
assert.doesNotMatch(source, /new Date\(fechaTrabajo\)/);
assert.match(source, /Fecha Intervenci.n': formatWorkDate\(r\.fecha_trabajo\)/);
assert.match(source, /Date\.UTC\(Number\(year\), Number\(month\) - 1, Number\(day\)\)/);
assert.match(source, /timeZone: 'UTC'/);
assert.match(source, /isFutureWorkDate\(r\.fecha_trabajo\)/);
assert.match(source, /Fecha de trabajo futura/);
assert.doesNotMatch(source, /fmtDate\(r\.creado_en\)/);
assert.doesNotMatch(source, /r\.creado_en < desde/);
assert.doesNotMatch(source, /r\.creado_en > hasta/);

console.log('Liquidaciones work-date contract: OK');
