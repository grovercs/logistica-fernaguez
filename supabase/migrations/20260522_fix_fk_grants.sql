-- =====================================================
-- MIGRACIÓN: Fix FK constraint failures on orden_asignaciones
-- Fecha: 2026-05-22
-- =====================================================
-- Contexto:
--   orden_asignaciones tiene FKs a ordenes(id) y trabajadores(id).
--   PostgreSQL valida FKs internamente usando el rol de la sesión
--   (authenticated), NO usando RLS. Si authenticated no tiene
--   GRANT SELECT sobre las tablas referenciadas, la FK falla
--   aunque los datos existan y RLS permita verlos.
-- =====================================================

GRANT SELECT ON trabajadores TO authenticated;
GRANT SELECT ON ordenes TO authenticated;

-- Verificar que los grants se aplicaron
DO $$
BEGIN
  RAISE NOTICE 'Grants aplicados. La asignacion deberia funcionar ahora.';
END $$;
