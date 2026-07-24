-- =====================================================
-- MIGRACIÓN: Limpiar todas las órdenes de prueba
-- Fecha: 2026-05-23
-- Propósito: Borrar todas las órdenes, reportes y asignaciones
--            para dejar la base de datos limpia antes de
--            que el cliente empiece a usar el sistema.
-- ATENCIÓN: Esta acción NO se puede deshacer.
-- =====================================================

-- Borramos en orden para respetar las FKs (hijos primero, padres después)

-- 1. Borrar todos los reportes (fotos/firmas en storage/cloudinary quedan huérfanas)
DELETE FROM public.reportes;

-- 2. Borrar todas las asignaciones
DELETE FROM public.orden_asignaciones;

-- 3. Borrar todas las órdenes
DELETE FROM public.ordenes;

-- 4. Reiniciar el contador de órdenes para que la siguiente sea OB-2026-0001
--    (Solo si existe la secuencia creada por la migración 20260523_contador_ordenes.sql)
--    Si no existe, esta línea fallará silenciosamente gracias a IF EXISTS.
DO $$
BEGIN
    PERFORM setval(
        pg_get_serial_sequence('public.ordenes_contador', 'id'),
        1,
        false
    );
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'Tabla ordenes_contador no existe, omitiendo reinicio.';
END $$;
