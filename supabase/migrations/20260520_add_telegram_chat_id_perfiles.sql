-- =====================================================
-- MIGRACIÓN: Añadir telegram_chat_id a tabla perfiles
-- Fecha: 2026-05-20
-- Propósito: Permitir que usuarios (no solo trabajadores)
--            tengan un Chat ID de Telegram para notificaciones.
-- =====================================================

ALTER TABLE public.perfiles ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

COMMENT ON COLUMN public.perfiles.telegram_chat_id IS 'Chat ID de Telegram para notificaciones push al usuario.';
