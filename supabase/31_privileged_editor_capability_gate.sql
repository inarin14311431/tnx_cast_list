create or replace function public.has_privileged_editor_tools()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    auth.uid() is not null
    and exists (
      select 1
      from public.master_search_users msu
      where msu.user_id = auth.uid()
    );
$$;

revoke all on function public.has_privileged_editor_tools() from public, anon;
grant execute on function public.has_privileged_editor_tools() to authenticated;
