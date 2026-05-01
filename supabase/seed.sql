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
-- IMPORTANT: Users and Reservations are tied to Supabase Auth.
-- =============================================================
--
-- STEP 1 - Create the admin user in Supabase Auth:
--   Go to Authentication > Users > Add User
--   Email: admin@escola.com
--   Password: admin123
--   (Or use the SQL alternative below)
--
--   🔐 SQL alternative (run this instead of using the UI):
--   -- NOTE: This requires the pgcrypto extension (usually enabled by default)
--   select service_role;
--   select extensions.gen_salt('bf') into salt;
--   insert into auth.users
--     (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
--      raw_user_app_meta_data, raw_user_meta_data, created_at, updated_at,
--      confirmation_token, email_change, email_change_token_new, recovery_token)
--   values
--     ('00000000-0000-0000-0000-000000000000',
--      gen_random_uuid(),
--      'authenticated',
--      'authenticated',
--      'admin@escola.com',
--      crypt('admin123', extensions.gen_salt('bf')),
--      now(),
--      '{"provider": "email", "providers": ["email"]}',
--      '{"name": "Administrador", "role": "admin", "phone": ""}',
--      now(), now(),
--      '', '', '', '');
--
--   The trigger handle_new_user() will auto-create the profile
--   with the metadata above. No extra SQL needed.
--
-- STEP 2 - (Only if using UI in STEP 1):
--   If you created the admin via the Auth Users UI (not SQL),
--   run this to set name, role, and phone:
--
--   update public.profiles
--   set name = 'Administrador',
--       role = 'admin'
--   where email = 'admin@escola.com';
--
-- STEP 3 - Now log in at the app:
--   Email: admin@escola.com
--   Password: admin123
--
-- STEP 4 - Create regular users via the app UI (Admin > Usuários > + Novo):
--   The app now calls supabase.auth.signUp() which creates the user
--   in Auth AND the trigger auto-creates the profile.
-- =============================================================
