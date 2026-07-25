begin;

-- Register act history as the current authenticated user.
-- Any public cast may be referenced. A private cast may be referenced only when
-- it is owned by the current user. This function never changes GitHub Pages.
create or replace function public.record_act_history_for_current_user(
  p_slug text,
  p_act_name text,
  p_ruler_name text,
  p_participant_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_act_id uuid;
  v_existing_publisher uuid;
  v_participant_ids uuid[];
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;

  if p_slug is null
     or p_slug !~ '^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$' then
    raise exception 'Act slug format is invalid.';
  end if;

  if p_act_name is null or length(btrim(p_act_name)) < 1 or length(p_act_name) > 200 then
    raise exception 'Act name must be between 1 and 200 characters.';
  end if;

  if length(coalesce(p_ruler_name, '')) > 120 then
    raise exception 'Ruler name must be 120 characters or fewer.';
  end if;

  select array_agg(character_id order by first_order)
    into v_participant_ids
  from (
    select character_id, min(ordinality) as first_order
    from unnest(coalesce(p_participant_ids, array[]::uuid[]))
      with ordinality as p(character_id, ordinality)
    group by character_id
  ) ordered_ids;

  if coalesce(array_length(v_participant_ids, 1), 0) < 1
     or coalesce(array_length(v_participant_ids, 1), 0) > 6 then
    raise exception 'Participant count must be between 1 and 6.';
  end if;

  if (
    select count(*)
    from public.characters c
    where c.id = any(v_participant_ids)
      and (
        c.visibility = 'public'
        or (c.visibility = 'private' and c.owner_id = v_user_id)
      )
  ) <> array_length(v_participant_ids, 1) then
    raise exception 'One or more participant characters are not accessible.'
      using errcode = '42501';
  end if;

  select id, published_by
    into v_act_id, v_existing_publisher
  from public.acts
  where slug = p_slug
  for update;

  if found then
    if v_existing_publisher is not null and v_existing_publisher <> v_user_id then
      raise exception 'This act slug is owned by another user.'
        using errcode = '42501';
    end if;

    update public.acts set
      act_name = btrim(p_act_name),
      ruler_name = coalesce(btrim(p_ruler_name), ''),
      published_by = v_user_id,
      published_at = now()
    where id = v_act_id;
  else
    insert into public.acts (
      slug, act_name, ruler_name, public_url, published_by, published_at
    ) values (
      p_slug, btrim(p_act_name), coalesce(btrim(p_ruler_name), ''), '',
      v_user_id, now()
    )
    returning id into v_act_id;
  end if;

  delete from public.act_participants
  where act_id = v_act_id
    and not (character_id = any(v_participant_ids));

  insert into public.act_participants (
    act_id,
    character_id,
    character_public_id,
    character_name,
    player_name,
    cast_order
  )
  select
    v_act_id,
    c.id,
    c.public_id,
    c.character_name,
    coalesce(c.player_name, ''),
    p.ordinality::smallint
  from unnest(v_participant_ids) with ordinality as p(character_id, ordinality)
  join public.characters c on c.id = p.character_id
  where c.visibility = 'public'
     or (c.visibility = 'private' and c.owner_id = v_user_id)
  on conflict (act_id, character_id) do update set
    character_public_id = excluded.character_public_id,
    character_name = excluded.character_name,
    player_name = excluded.player_name,
    cast_order = excluded.cast_order;

  if (
    select count(*)
    from public.act_participants
    where act_id = v_act_id
      and character_id = any(v_participant_ids)
  ) <> array_length(v_participant_ids, 1) then
    raise exception 'One or more participant characters could not be registered.';
  end if;

  return v_act_id;
end;
$$;

revoke all on function public.record_act_history_for_current_user(text, text, text, uuid[]) from public;
grant execute on function public.record_act_history_for_current_user(text, text, text, uuid[]) to authenticated;

notify pgrst, 'reload schema';
commit;
