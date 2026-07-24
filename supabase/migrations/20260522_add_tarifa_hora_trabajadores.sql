-- =====================================================
-- MIGRACIÓN: Añadir tarifa_hora a trabajadores
-- Fecha: 2026-05-22
-- =====================================================
-- Contexto:
--   La tarifa por hora solo existía en perfiles, vinculada
--   por auth_user_id. Cuando un trabajador no tenía usuario
--   de auth creado, la tarifa no se podía guardar ni leer.
--   Además, al editar un trabajador, el modal lee tarifa_hora
--   de trabajadores pero la columna no existía, por lo que
--   el campo aparecía siempre vacío.
-- =====================================================

ALTER TABLE public.trabajadores
ADD COLUMN IF NOT EXISTS tarifa_hora NUMERIC(10, 2) DEFAULT 0;

-- Sincronizar tarifa_hora desde perfiles a trabajadores
-- para los trabajadores que ya tienen auth_user_id vinculado
UPDATE public.trabajadores t
SET tarifa_hora = p.tarifa_hora
FROM public.perfiles p
WHERE t.auth_user_id = p.id
  AND p.tarifa_hora IS NOT NULL
  AND (t.tarifa_hora IS NULL OR t.tarifa_hora = 0);
