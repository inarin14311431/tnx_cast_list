begin;

-- Corrective migration for 44_act_showcase_delete.sql.
-- act_showcase_guests uses owner_id/showcase_slug (migration 42), not
-- published_by/act_slug. Keep the published ACT history row and only clear
-- SHOWCASE publication data plus guest rows owned by the current user.
create or replace function public.delete_owned_act_showcase(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_slug text := lower(trim(coalesce(p_slug, '')));
  v_act_id uuid;
  v_deleted_guest_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;

  if v_slug = '' then
    raise exception 'Act showcase slug is required.' using errcode = '22023';
  end if;

  select a.id
    into v_act_id
  from public.acts a
  where a.slug = v_slug
    and a.published_by = v_user_id
    and a.showcase_data is not null
  for update;

  if v_act_id is null then
    raise exception 'Owned act showcase was not found.' using errcode = 'P0002';
  end if;

  delete from public.act_showcase_guests g
  where g.showcase_slug = v_slug
    and g.owner_id = v_user_id;
  get diagnostics v_deleted_guest_count = row_count;

  update public.acts
  set showcase_data = null,
      showcase_public = false,
      showcase_updated_at = null,
      public_url = null,
      updated_at = now()
  where id = v_act_id
    and published_by = v_user_id;

  return jsonb_build_object(
    'deleted', true,
    'slug', v_slug,
    'actId', v_act_id,
    'deletedGuestCount', v_deleted_guest_count
  );
end;
$$;

revoke all on function public.delete_owned_act_showcase(text) from public;
revoke all on function public.delete_owned_act_showcase(text) from anon;
grant execute on function public.delete_owned_act_showcase(text) to authenticated;

notify pgrst, 'reload schema';
commit;
