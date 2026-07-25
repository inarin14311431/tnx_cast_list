begin;

-- Allow an unowned legacy slug to be claimed by the first authenticated publisher,
-- while continuing to prevent one user from overwriting another user's slug.
create or replace function public.record_act_publication(
  p_slug text,
  p_act_name text,
  p_ruler_name text,
  p_public_url text,
  p_published_by uuid,
  p_participant_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_act_id uuid;
  v_existing_publisher uuid;
begin
  if p_published_by is null then
    raise exception 'Publisher identity is required.' using errcode = '28000';
  end if;

  if coalesce(array_length(p_participant_ids, 1), 0) < 1
     or coalesce(array_length(p_participant_ids, 1), 0) > 6 then
    raise exception 'Participant count must be between 1 and 6.';
  end if;

  select id, published_by
    into v_act_id, v_existing_publisher
  from public.acts
  where slug = p_slug
  for update;

  if found then
    if v_existing_publisher is not null and v_existing_publisher <> p_published_by then
      raise exception 'This showcase slug is owned by another publisher.'
        using errcode = '42501';
    end if;

    update public.acts set
      act_name = p_act_name,
      ruler_name = coalesce(p_ruler_name, ''),
      public_url = p_public_url,
      published_by = p_published_by,
      published_at = now()
    where id = v_act_id;
  else
    insert into public.acts (
      slug, act_name, ruler_name, public_url, published_by, published_at
    ) values (
      p_slug, p_act_name, coalesce(p_ruler_name, ''), p_public_url,
      p_published_by, now()
    )
    returning id into v_act_id;
  end if;

  delete from public.act_participants
  where act_id = v_act_id
    and not (character_id = any(p_participant_ids));

  insert into public.act_participants (
    act_id, character_id, character_public_id, character_name, player_name, cast_order
  )
  select
    v_act_id, c.id, c.public_id, c.character_name, coalesce(c.player_name, ''),
    p.ordinality::smallint
  from unnest(p_participant_ids) with ordinality as p(character_id, ordinality)
  join public.characters c on c.id = p.character_id
  where c.visibility = 'public'
  on conflict (act_id, character_id) do update set
    character_public_id = excluded.character_public_id,
    character_name = excluded.character_name,
    player_name = excluded.player_name,
    cast_order = excluded.cast_order;

  if (
    select count(*) from public.act_participants
    where act_id = v_act_id and character_id = any(p_participant_ids)
  ) <> array_length(p_participant_ids, 1) then
    raise exception 'One or more participant characters are not public or do not exist.';
  end if;

  return v_act_id;
end;
$$;

-- Register or update act history without creating or changing a GitHub Pages file.
-- Existing public_url is deliberately preserved when the slug already has a page.
create or replace function public.record_act_history(
  p_slug text,
  p_act_name text,
  p_ruler_name text,
  p_recorded_by uuid,
  p_participant_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_act_id uuid;
  v_existing_publisher uuid;
begin
  if p_recorded_by is null then
    raise exception 'Recorder identity is required.' using errcode = '28000';
  end if;

  if coalesce(array_length(p_participant_ids, 1), 0) < 1
     or coalesce(array_length(p_participant_ids, 1), 0) > 6 then
    raise exception 'Participant count must be between 1 and 6.';
  end if;

  select id, published_by
    into v_act_id, v_existing_publisher
  from public.acts
  where slug = p_slug
  for update;

  if found then
    if v_existing_publisher is not null and v_existing_publisher <> p_recorded_by then
      raise exception 'This act slug is owned by another user.'
        using errcode = '42501';
    end if;

    update public.acts set
      act_name = p_act_name,
      ruler_name = coalesce(p_ruler_name, ''),
      published_by = p_recorded_by,
      published_at = now()
    where id = v_act_id;
  else
    insert into public.acts (
      slug, act_name, ruler_name, public_url, published_by, published_at
    ) values (
      p_slug, p_act_name, coalesce(p_ruler_name, ''), '',
      p_recorded_by, now()
    )
    returning id into v_act_id;
  end if;

  delete from public.act_participants
  where act_id = v_act_id
    and not (character_id = any(p_participant_ids));

  insert into public.act_participants (
    act_id, character_id, character_public_id, character_name, player_name, cast_order
  )
  select
    v_act_id, c.id, c.public_id, c.character_name, coalesce(c.player_name, ''),
    p.ordinality::smallint
  from unnest(p_participant_ids) with ordinality as p(character_id, ordinality)
  join public.characters c on c.id = p.character_id
  where c.visibility = 'public'
  on conflict (act_id, character_id) do update set
    character_public_id = excluded.character_public_id,
    character_name = excluded.character_name,
    player_name = excluded.player_name,
    cast_order = excluded.cast_order;

  if (
    select count(*) from public.act_participants
    where act_id = v_act_id and character_id = any(p_participant_ids)
  ) <> array_length(p_participant_ids, 1) then
    raise exception 'One or more participant characters are not public or do not exist.';
  end if;

  return v_act_id;
end;
$$;

revoke all on function public.record_act_publication(text, text, text, text, uuid, uuid[]) from public;
grant execute on function public.record_act_publication(text, text, text, text, uuid, uuid[]) to service_role;
revoke all on function public.record_act_history(text, text, text, uuid, uuid[]) from public;
grant execute on function public.record_act_history(text, text, text, uuid, uuid[]) to service_role;

notify pgrst, 'reload schema';
commit;
