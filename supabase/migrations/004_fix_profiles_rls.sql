-- =============================================================
-- ADECOMPT - PARTE 4: Correção de RLS em profiles
-- =============================================================
-- Problema: o admin não conseguia editar nem ativar/desativar
-- usuários. O UPDATE em public.profiles afetava 0 linhas (erro 406
-- "Cannot coerce the result to a single JSON object").
--
-- Causa: as policies de profiles verificavam "é admin?" com uma
-- subconsulta que lê a PRÓPRIA tabela profiles. Uma policy na tabela
-- profiles que consulta profiles é auto-referente e o Postgres não a
-- avalia de forma confiável (retorna 0 linhas / risco de recursão).
--
-- Solução recomendada pelo Supabase: encapsular a verificação de
-- admin numa função SECURITY DEFINER, que ignora o RLS ao ler, e
-- usá-la nas policies. Idempotente — pode rodar mais de uma vez.
-- =============================================================

-- 1. Função auxiliar: verdadeira se o usuário logado é admin.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- 2. Recriar a policy de UPDATE de profiles usando is_admin().
--    USING  -> quais linhas existentes podem ser alvo do update
--    WITH CHECK -> a linha resultante também precisa ser permitida
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using ( id = auth.uid() or public.is_admin() )
  with check ( id = auth.uid() or public.is_admin() );

-- 3. Recriar a policy de DELETE de profiles usando is_admin().
drop policy if exists "Admin can delete profiles" on public.profiles;
create policy "Admin can delete profiles"
  on public.profiles for delete
  using ( public.is_admin() );

-- =============================================================
-- (Opcional) As demais tabelas (carts, devices, reservations,
-- school_periods) já funcionam porque consultam profiles a partir
-- de OUTRA tabela (sem auto-referência). Se quiser padronizar,
-- pode trocar os blocos
--   exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
-- por
--   public.is_admin()
-- nessas policies também — é equivalente e mais legível.
-- =============================================================
