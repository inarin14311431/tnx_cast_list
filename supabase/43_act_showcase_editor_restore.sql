begin;

create or replace function public.get_owned_act_showcase_editor(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_act public.acts%rowtype;
  v_participants jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;

  select a.*
  into v_act
  from public.acts a
  where a.slug = p_slug
    and a.published_by = v_user_id
  limit 1;

  if not found then
    raise exception 'Owned act showcase was not found.' using errcode = '42501';
  end if;

  if v_act.showcase_data is null then
    raise exception 'Act showcase data is not available.';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'characterId', ap.character_id,
        'characterPublicId', ap.character_public_id,
        'castOrder', ap.cast_order,
        'participationRole', coalesce(ap.participation_role, ''),
        'characterName', ap.character_name,
        'playerName', ap.player_name
      ) order by ap.cast_order, ap.id
    ),
    '[]'::jsonb
  )
  into v_participants
  from public.act_participants ap
  where ap.act_id = v_act.id;

  return jsonb_build_object(
    'slug', v_act.slug,
    'actName', v_act.act_name,
    'rulerName', v_act.ruler_name,
    'showcasePublic', v_act.showcase_public,
    'showcaseUpdatedAt', v_act.showcase_updated_at,
    'showcaseData', v_act.showcase_data,
    'participants', v_participants
  );
end;
$$;

revoke all on function public.get_owned_act_showcase_editor(text) from public;
revoke all on function public.get_owned_act_showcase_editor(text) from anon;
grant execute on function public.get_owned_act_showcase_editor(text) to authenticated;

notify pgrst, 'reload schema';
commit;
