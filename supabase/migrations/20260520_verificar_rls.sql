-- =====================================================
-- CONSULTA DE VERIFICACIÓN: Estado de RLS en todas las tablas
-- Ejecuta esto en el SQL Editor de Supabase para confirmar
-- que la brecha de seguridad está cerrada.
-- =====================================================

-- Verificar qué tablas públicas tienen RLS habilitado
SELECT
    schemaname AS schema,
    tablename AS tabla,
    rowsecurity AS rls_habilitado
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Contar cuántas políticas RLS tiene cada tabla
SELECT
    schemaname AS schema,
    tablename AS tabla,
    COUNT(*) AS num_politicas
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- Listado completo de políticas RLS existentes
SELECT
    schemaname AS schema,
    tablename AS tabla,
    policyname AS politica,
    permissive AS tipo,
    roles AS roles_afectados,
    cmd AS operacion,
    qual AS condicion_select,
    with_check AS condicion_insert_update
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
