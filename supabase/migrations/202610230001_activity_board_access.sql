-- 5PACE Activity Board: authenticated access and administrator management
-- Run this migration once in Supabase SQL Editor as project owner.
-- This exposes only a boolean admin check to authenticated clients.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select private.is_admin();
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.activities enable row level security;

drop policy if exists "approved members and admins read activities" on public.activities;
drop policy if exists "authenticated read activities" on public.activities;
drop policy if exists "public read non-draft activities" on public.activities;

create policy "approved members and admins read activities"
on public.activities
for select
to authenticated
using (
  private.is_admin()
  or (private.is_approved_member() and status <> 'draft')
);

drop policy if exists "admins insert activities" on public.activities;
create policy "admins insert activities"
on public.activities
for insert
to authenticated
with check (private.is_admin());

drop policy if exists "admins update activities" on public.activities;
create policy "admins update activities"
on public.activities
for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "admins delete activities" on public.activities;
create policy "admins delete activities"
on public.activities
for delete
to authenticated
using (private.is_admin());

grant select, insert, update, delete on public.activities to authenticated;
