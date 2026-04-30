-- =============================================================
-- ADECOMPT - Sistema de Reserva de Computadores
-- Migration 001: Initial Schema
-- Apply this file in Supabase SQL Editor
-- =============================================================

-- 1. EXTENSIONS
create extension if not exists "pgcrypto";

-- =============================================================
-- 2. TABLES
-- =============================================================

-- 2.1 Profiles (syncs with Supabase Auth)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  email text unique not null,
  role text not null check (role in ('professor', 'coordenador', 'vice-diretor', 'diretor', 'admin')),
  phone text default '',
  user_status text default 'ativo' check (user_status in ('ativo', 'inativo')),
  created_at timestamptz default now()
);

-- 2.2 Carts
create table public.carts (
  id uuid default gen_random_uuid() primary key,
  cart_name text not null,
  floor text not null,
  device_type text not null,
  created_at timestamptz default now()
);

-- 2.3 Devices
create table public.devices (
  id uuid default gen_random_uuid() primary key,
  cart_id uuid references public.carts(id) on delete cascade not null,
  device_number integer not null check (device_number between 1 and 40),
  device_serial text not null default '',
  device_brand text not null default '',
  device_type text default '',
  created_at timestamptz default now(),
  unique (cart_id, device_number)
);

-- 2.4 Reservations
create table public.reservations (
  id uuid default gen_random_uuid() primary key,
  cart_id uuid references public.carts(id) on delete cascade,
  cart_name text not null default '',
  floor text not null default '',
  device_type text not null default '',
  device_number text not null default '',
  device_brand text not null default '',
  device_serial text not null default '',
  reserved_by text not null default '',
  reserved_email text not null default '',
  date text not null default '',
  period text not null default '',
  status text not null default 'active' check (status in ('active', 'completed')),
  notification_sent boolean default false,
  created_at timestamptz default now()
);

-- 2.5 School Periods (config)
create table public.school_periods (
  id uuid default gen_random_uuid() primary key,
  periods_json jsonb not null,
  updated_at timestamptz default now()
);

-- =============================================================
-- 3. INDEXES
-- =============================================================
create index idx_devices_cart_id on public.devices(cart_id);
create index idx_reservations_date on public.reservations(date);
create index idx_reservations_email on public.reservations(reserved_email);
create index idx_reservations_status on public.reservations(status);
create index idx_reservations_cart_date on public.reservations(cart_name, date);
create index idx_profiles_email on public.profiles(email);

-- =============================================================
-- 4. ROW LEVEL SECURITY
-- =============================================================
alter table public.profiles enable row level security;
alter table public.carts enable row level security;
alter table public.devices enable row level security;
alter table public.reservations enable row level security;
alter table public.school_periods enable row level security;

-- 4.1 Profiles policies
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid());

-- 4.2 Carts policies (readable by all authenticated, writable by admin only)
create policy "Carts are viewable by authenticated users"
  on public.carts for select
  using (auth.role() = 'authenticated');

create policy "Carts are insertable by admin"
  on public.carts for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Carts are updatable by admin"
  on public.carts for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Carts are deletable by admin"
  on public.carts for delete
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 4.3 Devices policies
create policy "Devices are viewable by authenticated users"
  on public.devices for select
  using (auth.role() = 'authenticated');

create policy "Devices are manageable by admin"
  on public.devices for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Devices are updatable by admin"
  on public.devices for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Devices are deletable by admin"
  on public.devices for delete
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 4.4 Reservations policies
create policy "Reservations are viewable by authenticated users"
  on public.reservations for select
  using (auth.role() = 'authenticated');

create policy "Reservations are insertable by authenticated users"
  on public.reservations for insert
  with check (auth.role() = 'authenticated');

create policy "Reservations are updatable by owners or admin"
  on public.reservations for update
  using (
    reserved_email = auth.jwt() ->> 'email'
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Reservations are deletable by owners or admin"
  on public.reservations for delete
  using (
    reserved_email = auth.jwt() ->> 'email'
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 4.5 School Periods policies
create policy "School periods are viewable by authenticated users"
  on public.school_periods for select
  using (auth.role() = 'authenticated');

create policy "School periods are manageable by admin"
  on public.school_periods for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "School periods are updatable by admin"
  on public.school_periods for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "School periods are deletable by admin"
  on public.school_periods for delete
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- =============================================================
-- 5. AUTO-CREATE PROFILE ON AUTH SIGNUP
-- =============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, role, phone, user_status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'professor'),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    'ativo'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
