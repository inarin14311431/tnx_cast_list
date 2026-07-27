-- Upgrade an existing SKD / OFC master search installation from
-- "all authenticated users" to an explicit UID allowlist.

create table if not exists public.master_search_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  memo text not null default '',
  created_at timestamptz not null default now()
);

alter table public.master_search_users enable row level security;
revoke all on table public.master_search_users from anon;
revoke all on table public.master_search_users from authenticated;
grant all on table public.master_search_users to service_role;

create or replace function public.can_use_master_search()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.master_search_users allowed
      where allowed.user_id = auth.uid()
    );
$$;

revoke all on function public.can_use_master_search() from public;
revoke all on function public.can_use_master_search() from anon;
grant execute on function public.can_use_master_search() to authenticated;

drop policy if exists skd_master_authenticated_select on public.skd_master;
drop policy if exists skd_master_allowed_select on public.skd_master;
create policy skd_master_allowed_select
on public.skd_master
for select
to authenticated
using (public.can_use_master_search());

drop policy if exists ofc_master_authenticated_select on public.ofc_master;
drop policy if exists ofc_master_allowed_select on public.ofc_master;
create policy ofc_master_allowed_select
on public.ofc_master
for select
to authenticated
using (public.can_use_master_search());

comment on table public.master_search_users is 'Explicit UID allowlist for SKD / OFC master search.';
comment on function public.can_use_master_search() is 'Returns true only when the current authenticated UID is registered in master_search_users.';

-- Register an allowed UID with:
-- insert into public.master_search_users (user_id, memo)
-- values ('00000000-0000-0000-0000-000000000000', 'SKD/OFC search user')
-- on conflict (user_id) do update set memo = excluded.memo;
--
-- Revoke access with:
-- delete from public.master_search_users
-- where user_id = '00000000-0000-0000-0000-000000000000';
