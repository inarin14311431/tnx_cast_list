begin;

-- Delete one participation-history row only when its character is owned by the
-- current authenticated user. Experience points stored on that row are removed
-- together with the history record. Other users' rows are never touched.
create or replace function public.delete_owned_act_participation(
  p_participation_id bigint
)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_act_id uuid;
  v_deleted_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;

  select ap.act_id
    into v_act_id
  from public.act_participants ap
  join public.characters c on c.id = ap.character_id
  where ap.id = p_participation_id
    and c.owner_id = v_user_id
  for update of ap;

  if not found then
    raise exception 'The participation record does not exist or is not owned by the current user.'
      using errcode = '42501';
  end if;

  delete from public.act_participants
  where id = p_participation_id;

  get diagnostics v_deleted_count = row_count;
  if v_deleted_count <> 1 then
    raise exception 'The participation record could not be deleted.';
  end if;

  -- Remove empty history-only metadata created by the same user. Published act
  -- metadata is retained so an existing GitHub Pages URL is never invalidated.
  delete from public.acts a
  where a.id = v_act_id
    and a.published_by = v_user_id
    and coalesce(a.public_url, '') = ''
    and not exists (
      select 1
      from public.act_participants ap
      where ap.act_id = a.id
    );

  return true;
end;
$$;

revoke all on function public.delete_owned_act_participation(bigint) from public;
grant execute on function public.delete_owned_act_participation(bigint) to authenticated;

notify pgrst, 'reload schema';
commit;
