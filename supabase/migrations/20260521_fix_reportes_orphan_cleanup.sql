-- =====================================================
-- MIGRACIÓN: Limpiar reportes huérfanos y añadir ON DELETE CASCADE
-- Fecha: 2026-05-21
-- Problema: Al borrar órdenes, los reportes asociados quedan
--           huérfanos en la tabla reportes.
--           Ej: OB-2026-3706 sigue en liquidaciones aunque
--           la orden fue borrada.
-- =====================================================

-- 1. Primero eliminamos los reportes que no tienen orden asociada
--    (reportes huérfanos existentes)
DELETE FROM reportes
WHERE orden_id IS NULL
   OR orden_id NOT IN (SELECT id FROM ordenes);

-- 2. Verificamos si existe la FK reportes -> ordenes y la recreamos
--    con ON DELETE CASCADE para que al borrar una orden se borren
--    automáticamente sus reportes.
DO $$
DECLARE
    fk_name TEXT;
BEGIN
    -- Buscar el nombre de la FK existente
    SELECT tc.constraint_name INTO fk_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'reportes'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'ordenes';

    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE reportes DROP CONSTRAINT %I', fk_name);
    END IF;
END $$;

-- 3. Recrear la FK con ON DELETE CASCADE
--    (solo si la columna orden_id existe)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reportes' AND column_name = 'orden_id'
    ) THEN
        ALTER TABLE reportes
        ADD CONSTRAINT fk_reportes_ordenes
        FOREIGN KEY (orden_id) REFERENCES ordenes(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Comentario actualizado
COMMENT ON TABLE reportes IS 'Reportes/intervenciones de trabajo. Se borran automáticamente al eliminar la orden asociada (ON DELETE CASCADE).';
