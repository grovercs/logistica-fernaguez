-- LIMPIEZA TOTAL DE ÓRDENES DE PRUEBA
-- Ejecutar esto en Supabase SQL Editor (revisar primero con el SELECT)

-- 1. Ver qué hay antes de borrar (recomendado ejecutar primero)
SELECT id_legible, cliente, estado, creado_en
FROM public.ordenes
ORDER BY creado_en DESC;

-- 2. Borrar TODAS las órdenes (incluye asignaciones y reportes por CASCADE)
-- DESCOMENTAR SOLO SI ESTÁS SEGURO DE BORRAR TODO:
-- DELETE FROM public.ordenes;

-- 3. Verificar que quedó limpio
-- SELECT COUNT(*) FROM public.ordenes;

-- 4. Resetear secuencia (opcional, para empezar desde 0001)
-- No necesita nada especial: el código calcula el máximo existente.
-- Si no hay órdenes, la primera será OB-2026-0001.
