-- =============================================================
-- ADECOMPT - Seed Data
-- Execute AFTER: 001_initial_schema.sql
-- Run this in Supabase SQL Editor to populate initial data
-- =============================================================

-- =============================================================
-- 1. SCHOOL PERIODS (default)
-- =============================================================
insert into public.school_periods (periods_json)
values (
  '[
    "1º Horário (07:00-07:50)",
    "2º Horário (07:50-08:40)",
    "3º Horário (08:40-09:30)",
    "Intervalo (09:30-09:50)",
    "4º Horário (09:50-10:40)",
    "5º Horário (10:40-11:30)",
    "6º Horário (13:00-13:50)",
    "7º Horário (13:50-14:40)",
    "8º Horário (14:40-15:30)",
    "Intervalo (15:30-15:50)",
    "9º Horário (15:50-16:40)",
    "10º Horário (16:40-17:30)"
  ]'::jsonb
);

-- =============================================================
-- 2. CARTS
-- =============================================================
insert into public.carts (id, cart_name, floor, device_type, created_at)
values
  ('a0000000-0000-0000-0000-000000000001', 'Carrinho Técnico', 'Laboratório', 'Notebook', '2026-04-24T17:23:21.461Z'),
  ('a0000000-0000-0000-0000-000000000002', 'Carrinho Leitura', '2º Andar', 'Notebook', '2026-04-24T17:58:16.908Z');

-- =============================================================
-- 3. DEVICES
-- =============================================================
insert into public.devices (cart_id, device_number, device_serial, device_brand, device_type, created_at)
values
  ('a0000000-0000-0000-0000-000000000001', 1, '01', 'Positivo', '', '2026-04-24T17:23:47.819Z'),
  ('a0000000-0000-0000-0000-000000000001', 2, '02', 'Positivo', '', '2026-04-24T18:07:31.557Z');

-- =============================================================
-- NOTE: Users and Reservations are tied to Supabase Auth.
-- After creating the admin user via Supabase Auth dashboard:
--   1. Go to Authentication > Users > Add User
--   2. Create: admin@escola.com / admin123
--   3. Then run the SQL below to set up the admin profile:
--
--   update public.profiles
--   set name = 'Administrador',
--       role = 'admin'
--   where email = 'admin@escola.com';
--
-- For regular users, they can be created via the app UI.
-- =============================================================
