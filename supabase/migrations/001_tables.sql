-- =============================================================
-- ADECOMPT - PARTE 1: CRIAR TABELAS
-- Instrução: Clique em "RUN" (▶️), NÃO em "Explain" (🔍)
-- =============================================================

-- Extensão necessária para UUIDs
create extension if not exists "pgcrypto";

-- =============================================================
-- Tabela: profiles (perfis de usuário, vinculado ao Auth)
-- =============================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  email text unique not null,
  role text not null check (role in ('professor', 'coordenador', 'vice-diretor', 'diretor', 'admin')),
  phone text default '',
  user_status text default 'ativo' check (user_status in ('ativo', 'inativo')),
  created_at timestamptz default now()
);

-- =============================================================
-- Tabela: carts (carrinhos de dispositivos)
-- =============================================================
create table public.carts (
  id uuid default gen_random_uuid() primary key,
  cart_name text not null,
  floor text not null,
  device_type text not null,
  created_at timestamptz default now()
);

-- =============================================================
-- Tabela: devices (dispositivos dentro de cada carrinho)
-- =============================================================
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

-- =============================================================
-- Tabela: reservations (reservas)
-- =============================================================
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

-- =============================================================
-- Tabela: school_periods (configuração de horários)
-- =============================================================
create table public.school_periods (
  id uuid default gen_random_uuid() primary key,
  periods_json jsonb not null,
  updated_at timestamptz default now()
);
