-- =============================================================
-- ADECOMPT - PARTE 3: Adicionar coluna turma às reservas
-- Instrução: Execute no SQL Editor do Supabase
-- =============================================================

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS turma text NOT NULL DEFAULT '';
