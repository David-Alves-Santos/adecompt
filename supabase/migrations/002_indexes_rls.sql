-- =============================================================
-- ADECOMPT - PARTE 2: ÍNDICES + SEGURANÇA (RLS) + TRIGGERS
-- Instrução: Clique em "RUN" (▶️), NÃO em "Explain" (🔍)
-- Execute APÓS a PARTE 1 (001_tables.sql)
-- =============================================================

-- =============================================================
-- 1. ÍNDICES (para performance)
-- =============================================================
create index idx_devices_cart_id on public.devices(cart_id);
create index idx_reservations_date on public.reservations(date);
create index idx_reservations_email on public.reservations(reserved_email);
create index idx_reservations_status on public.reservations(status);
create index idx_reservations_cart_date on public.reservations(cart_name, date);
create index idx_profiles_email on public.profiles(email);

-- =============================================================
-- 2. ROW LEVEL SECURITY (proteção a nível de linha)
-- =============================================================
alter table public.profiles enable row level security;
alter table public.carts enable row level security;
alter table public.devices enable row level security;
alter table public.reservations enable row level security;
alter table public.school_periods enable row level security;

-- 2.1 Profiles
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "Users can update own profile"
  on public.profiles for update
  using (
    id = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admin can delete profiles"
  on public.profiles for delete
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 2.2 Carts
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

-- 2.3 Devices
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

-- 2.4 Reservations
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

-- 2.5 School Periods
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
-- 3. TRIGGER: Criar perfil automaticamente ao cadastrar usuário
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

-- Aplicar o trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
