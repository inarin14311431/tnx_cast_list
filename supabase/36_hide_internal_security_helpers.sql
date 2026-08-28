-- Keep helper SECURITY DEFINER functions out of the exposed public schema.
create schema if not exists internal_security;
revoke all on schema internal_security from public, anon, authenticated;

create or replace function internal_security.can_use_master_search()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.master_search_users allowed
      where allowed.user_id = auth.uid()
    );
$$;
revoke all on function internal_security.can_use_master_search() from public, anon;
grant execute on function internal_security.can_use_master_search() to authenticated, service_role;

alter policy skd_master_allowed_select on public.skd_master
  using (internal_security.can_use_master_search());
alter policy ofc_master_allowed_select on public.ofc_master
  using (internal_security.can_use_master_search());

drop function if exists public.can_use_master_search();

create or replace function internal_security.generate_character_public_id()
returns text
language sql
security definer
set search_path = public, pg_temp
as $$
  select 'TNX-' || lpad(nextval('public.character_public_id_seq')::text, 6, '0');
$$;
revoke all on function internal_security.generate_character_public_id() from public, anon;
grant execute on function internal_security.generate_character_public_id() to authenticated, service_role;

alter table public.characters
  alter column public_id set default internal_security.generate_character_public_id();

drop function if exists public.generate_character_public_id();
