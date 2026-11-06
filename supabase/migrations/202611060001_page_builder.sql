-- 5PACE Page Builder: administrator-only configuration and public media delivery.
-- Run once in Supabase SQL Editor. Does not modify activity policies.

create table if not exists public.page_settings (
  id integer primary key check (id = 1),
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.page_settings enable row level security;
create table if not exists public.page_settings_drafts (
  id integer primary key check (id = 1),
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.page_settings_drafts enable row level security;
drop policy if exists "Admins manage page settings drafts" on public.page_settings_drafts;
create policy "Admins manage page settings drafts"
on public.page_settings_drafts for all
to authenticated
using (private.is_admin())
with check (private.is_admin());
grant select, insert, update, delete on public.page_settings_drafts to authenticated;


drop policy if exists "Page settings are publicly readable" on public.page_settings;
create policy "Page settings are publicly readable"
on public.page_settings for select
to anon, authenticated
using (true);

drop policy if exists "Admins manage page settings" on public.page_settings;
create policy "Admins manage page settings"
on public.page_settings for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

insert into public.page_settings (id, config)
values (1, jsonb_build_object(
  'theme', jsonb_build_object(
    'paper', '#f2f0ec',
    'white', '#fbfaf7',
    'ink', '#090909',
    'red', '#f20d19',
    'line', '#aaa7a0',
    'displayFont', 'Barlow Condensed',
    'bodyFont', 'Manrope'
  ),
  'sections', jsonb_build_object(
    'hero', jsonb_build_object('visible', true, 'order', 1),
    'magazine', jsonb_build_object('visible', true, 'order', 1),
    'activity-board', jsonb_build_object('visible', true, 'order', 2),
    'bottom-strip', jsonb_build_object('visible', true, 'order', 2),
    'about', jsonb_build_object('visible', true, 'order', 3)
  ),
  'images', '{}'::jsonb
))
on conflict (id) do nothing;


-- The frontend already calls db.rpc('is_admin'). Expose a safe wrapper
-- around the existing private function so the browser can check its own role.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin();
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

grant select, insert, update, delete on public.page_settings to authenticated;
grant select on public.page_settings to anon;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-media', 'site-media', true, 10485760, array['image/jpeg','image/png','image/webp','image/gif','image/avif'])
on conflict (id) do update set public = true;

drop policy if exists "Public can view 5PACE site media" on storage.objects;
create policy "Public can view 5PACE site media"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'site-media');

drop policy if exists "Admins upload 5PACE site media" on storage.objects;
create policy "Admins upload 5PACE site media"
on storage.objects for insert
to authenticated
with check (bucket_id = 'site-media' and private.is_admin());

drop policy if exists "Admins update 5PACE site media" on storage.objects;
create policy "Admins update 5PACE site media"
on storage.objects for update
to authenticated
using (bucket_id = 'site-media' and private.is_admin())
with check (bucket_id = 'site-media' and private.is_admin());

drop policy if exists "Admins delete 5PACE site media" on storage.objects;
create policy "Admins delete 5PACE site media"
on storage.objects for delete
to authenticated
using (bucket_id = 'site-media' and private.is_admin());
