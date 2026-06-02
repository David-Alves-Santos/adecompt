-- =============================================================
-- ADECOMPT - MIGRATION 003: Adicionar coluna turma
-- Execute no SQL Editor do Supabase
-- =============================================================

alter table public.reservations
  add column if not exists turma text not null default '';
