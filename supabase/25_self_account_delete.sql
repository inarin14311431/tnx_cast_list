begin;

create or replace function public.purge_user_application_data(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_character_count integer := 0;
  v_deleted_act_count integer := 0;
  v_anonymized_act_count integer := 0;
begin
  if p_user_id is null then raise exception 'User ID is required.'; end if;

  select count(*) into v_character_count from public.characters where owner_id = p_user_id;

  -- Character-owned tables use ON DELETE CASCADE (skills, outfits, combos,
  -- snapshots, experience spending and act participants). Delete the root rows
  -- so the database remains the source of truth for dependency cleanup.
  delete from public.characters where owner_id = p_user_id;

  -- Remove account-scoped permissions explicitly as well as via auth cascade.
  delete from public.master_search_users where user_id = p_user_id;

  -- Acts published by this user may contain legacy participant rows owned by
  -- somebody else. Preserve those rows, but remove the deleted user's public
  -- showcase and publisher identity. Acts with no participants can disappear.
  with deleted as (
    delete from public.acts a
    where a.published_by = p_user_id
      and not exists (select 1 from public.act_participants ap where ap.act_id = a.id)
    returning 1
  ) select count(*) into v_deleted_act_count from deleted;

  with anonymized as (
    update public.acts a
    set published_by = null,
        public_url = '',
        showcase_data = null,
        showcase_public = false,
        showcase_updated_at = null
    where a.published_by = p_user_id
    returning 1
  ) select count(*) into v_anonymized_act_count from anonymized;

  return jsonb_build_object(
    'deletedCharacterCount', v_character_count,
    'deletedActCount', v_deleted_act_count,
    'anonymizedActCount', v_anonymized_act_count
  );
end;
$$;

revoke all on function public.purge_user_application_data(uuid) from public, anon, authenticated;
grant execute on function public.purge_user_application_data(uuid) to service_role;

notify pgrst, 'reload schema';
commit;
