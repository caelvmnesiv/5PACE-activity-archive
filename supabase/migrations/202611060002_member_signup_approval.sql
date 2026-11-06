-- Member sign-up request, using the existing access_requests table.
alter table public.access_requests add column if not exists email text, add column if not exists full_name text;
create or replace function public.create_member_access_request()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.access_requests r where r.user_id = new.id) then
    insert into public.access_requests (user_id, message, status, email, full_name)
    values (new.id, 'Member registration request', 'pending', coalesce(new.email, ''), nullif(new.raw_user_meta_data ->> 'full_name', ''));
  end if;
  return new;
end;
$$;
revoke all on function public.create_member_access_request() from public;
drop trigger if exists on_auth_user_created_member_request on auth.users;
create trigger on_auth_user_created_member_request after insert on auth.users
for each row execute function public.create_member_access_request();
-- The existing private.is_approved_member() remains unchanged and checks access_requests.status.
