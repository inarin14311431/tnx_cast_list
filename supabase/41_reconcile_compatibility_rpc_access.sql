-- Preserve the compatibility wrapper while production clients still call it.
-- Recreate it after historical migration 36 on a rebuilt database.
begin;
create or replace function public.can_use_master_search()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select public.has_privileged_editor_tools(); $$;
revoke execute on function public.can_use_master_search() from public, anon;
grant execute on function public.can_use_master_search() to authenticated;
commit;
