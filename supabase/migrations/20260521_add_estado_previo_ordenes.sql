-- =====================================================
-- MIGRACIÓN: Añadir estado_previo a ordenes
-- Fecha: 2026-05-21
-- Propósito: Guardar el estado original de una orden antes
--            de archivarla, para saber si fue archivada
--            sin estar finalizada.
-- =====================================================

ALTER TABLE public.ordenes ADD COLUMN IF NOT EXISTS estado_previo TEXT;

COMMENT ON COLUMN public.ordenes.estado_previo IS 'Estado original antes de archivar. Útil para detectar obras archivadas sin finalizar y para restaurar al estado correcto.';
