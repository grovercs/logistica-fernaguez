import assert from 'node:assert/strict';

// Load the TypeScript module using Node.js native ESM TypeScript execution (Node >=22).
const { sortReportesByDate } = await import('./utils.ts');

function makeReport(overrides) {
  return {
    id: 'r-default',
    fecha_trabajo: null,
    creado_en: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// 1. Ordena por fecha_trabajo ascendente
{
  const input = [
    makeReport({ id: 'r-2', fecha_trabajo: '2026-03-15', creado_en: '2026-03-20T10:00:00Z' }),
    makeReport({ id: 'r-1', fecha_trabajo: '2026-03-10', creado_en: '2026-03-21T10:00:00Z' }),
    makeReport({ id: 'r-3', fecha_trabajo: '2026-03-20', creado_en: '2026-03-19T10:00:00Z' }),
  ];
  const sorted = sortReportesByDate(input);
  assert.deepStrictEqual(sorted.map(r => r.id), ['r-1', 'r-2', 'r-3']);
}

// 2. Creado_en ascendente como desempate para fechas iguales
{
  const input = [
    makeReport({ id: 'r-b', fecha_trabajo: '2026-03-15', creado_en: '2026-03-20T12:00:00Z' }),
    makeReport({ id: 'r-a', fecha_trabajo: '2026-03-15', creado_en: '2026-03-20T10:00:00Z' }),
  ];
  const sorted = sortReportesByDate(input);
  assert.deepStrictEqual(sorted.map(r => r.id), ['r-a', 'r-b']);
}

// 3. id como desempate final
{
  const input = [
    makeReport({ id: 'r-b', fecha_trabajo: '2026-03-15', creado_en: '2026-03-20T10:00:00Z' }),
    makeReport({ id: 'r-a', fecha_trabajo: '2026-03-15', creado_en: '2026-03-20T10:00:00Z' }),
  ];
  const sorted = sortReportesByDate(input);
  assert.deepStrictEqual(sorted.map(r => r.id), ['r-a', 'r-b']);
}

// 4. Reportes sin fecha van al final
{
  const input = [
    makeReport({ id: 'r-null', fecha_trabajo: null, creado_en: '2026-03-10T10:00:00Z' }),
    makeReport({ id: 'r-dated', fecha_trabajo: '2026-03-20', creado_en: '2026-03-25T10:00:00Z' }),
  ];
  const sorted = sortReportesByDate(input);
  assert.deepStrictEqual(sorted.map(r => r.id), ['r-dated', 'r-null']);
}

// 5. Entre reportes sin fecha, ordena por creado_en y luego id
{
  const input = [
    makeReport({ id: 'r-null-later', fecha_trabajo: null, creado_en: '2026-03-20T10:00:00Z' }),
    makeReport({ id: 'r-null-early', fecha_trabajo: null, creado_en: '2026-03-10T10:00:00Z' }),
  ];
  const sorted = sortReportesByDate(input);
  assert.deepStrictEqual(sorted.map(r => r.id), ['r-null-early', 'r-null-later']);
}

// 6. Fechas corregidas: reporte creado antes pero con fecha_trabajo posterior debe quedar después
{
  const input = [
    makeReport({ id: 'r-creado-primero-fecha-despues', fecha_trabajo: '2026-03-20', creado_en: '2026-03-10T10:00:00Z' }),
    makeReport({ id: 'r-creado-despues-fecha-antes', fecha_trabajo: '2026-03-15', creado_en: '2026-03-20T10:00:00Z' }),
  ];
  const sorted = sortReportesByDate(input);
  assert.deepStrictEqual(sorted.map(r => r.id), ['r-creado-despues-fecha-antes', 'r-creado-primero-fecha-despues']);
}

console.log('sortReportesByDate tests passed');
