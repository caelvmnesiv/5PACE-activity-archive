-- 5PACE member self-registration and administrator approval.
-- Run once in the Supabase SQL Editor as project owner after deploying the frontend.

create table if not exists public.member_access_requests (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);

alter table public.member_access_requests enable row level security;

drop policy if exists "members read own request and admins read all" on public.member_access_requests;
create policy "members read own request and admins read all"
on public.member_access_requests for select to authenticated
using (user_id = auth.uid() or private.is_admin());

drop policy if exists "admins review member requests" on public.member_access_requests;
create policy "admins review member requests"
on public.member_access_requests for update to authenticated
using (private.is_admin())
with check (private.is_admin());

revoke all on public.member_access_requests from anon, public;
grant select, update on public.member_access_requests to authenticated;

create or replace function public.create_member_access_request()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.member_access_requests (user_id, email, full_name, status)
  values (new.id, coalesce(new.email, ''), nullif(new.raw_user_meta_data ->> 'full_name', ''), 'pending')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_member_request on auth.users;
create trigger on_auth_user_created_member_request
after insert on auth.users
for each row execute function public.create_member_access_request();

create or replace function private.is_approved_member()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1 from public.member_access_requests
    where user_id = auth.uid() and status = 'approved'
  );
$$;

revoke all on function public.create_member_access_request() from public;
revoke all on function private.is_approved_member() from public;
grant execute on function private.is_approved_member() to authenticated;
