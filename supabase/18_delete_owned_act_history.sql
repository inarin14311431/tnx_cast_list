begin;

-- Delete one participation-history row only when the referenced character is
-- owned by the current authenticated user. The row's earned experience is
-- removed together with the participation record. Other users are untouched.
create or replace function public.delete_owned_act_participation(
  p_participation_id bigint
)
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_act_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;

  delete from public.act_participants ap
  using public.characters c
  where ap.id = p_participation_id
    and c.id = ap.character_id
    and c.owner_id = v_user_id
  returning ap.act_id into v_act_id;

  if not found then
    raise exception 'The participation record does not exist or is not owned by the current user.'
      using errcode = '42501';
  end if;

  -- A published showcase remains valid even after its final participation row
  -- is removed. Empty history-only metadata may be removed safely.
  delete from public.acts a
  where a.id = v_act_id
    and coalesce(a.public_url, '') = ''
    and (a.published_by = v_user_id or a.published_by is null)
    and not exists (
      select 1
      from public.act_participants remaining
      where remaining.act_id = a.id
    );

  return true;
end;
$$;

revoke all on function public.delete_owned_act_participation(bigint) from public;
grant execute on function public.delete_owned_act_participation(bigint) to authenticated;

notify pgrst, 'reload schema';
commit;
