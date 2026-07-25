begin;

-- History-only registration from the authenticated browser session.
-- Mixed selections are accepted, but only characters owned by the current user
-- are written to act_participants. Existing earned_experience is preserved.
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

  if coalesce(cardinality(p_participant_ids), 0) > 6 then
    raise exception 'Participant count must be 6 or fewer.';
  end if;

  select coalesce(array_agg(c.id order by requested.first_order), array[]::uuid[])
    into v_participant_ids
  from (
    select character_id, min(ordinality) as first_order
    from unnest(coalesce(p_participant_ids, array[]::uuid[]))
      with ordinality as p(character_id, ordinality)
    group by character_id
  ) requested
  join public.characters c on c.id = requested.character_id
  where c.owner_id = v_user_id
    and c.visibility in ('public', 'private');

  if cardinality(v_participant_ids) < 1 then
    raise exception '履歴登録対象となる自分のキャストがありません。';
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

  -- Never remove another user's participation row, even if legacy data exists
  -- under the same act.
  delete from public.act_participants ap
  where ap.act_id = v_act_id
    and exists (
      select 1
      from public.characters c
      where c.id = ap.character_id
        and c.owner_id = v_user_id
    )
    and not (ap.character_id = any(v_participant_ids));

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
  where c.owner_id = v_user_id
    and c.visibility in ('public', 'private')
  on conflict (act_id, character_id) do update set
    character_public_id = excluded.character_public_id,
    character_name = excluded.character_name,
    player_name = excluded.player_name,
    cast_order = excluded.cast_order;

  -- earned_experience is intentionally omitted from the conflict update.
  return v_act_id;
end;
$$;

-- Publication metadata and the publisher's own public-cast history are updated
-- together. A showcase may contain other users' public casts in its HTML, but
-- those IDs are ignored for history purposes. Zero owned participants is valid.
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
  v_participant_ids uuid[];
begin
  if p_published_by is null then
    raise exception 'Publisher identity is required.' using errcode = '28000';
  end if;

  if coalesce(cardinality(p_participant_ids), 0) > 6 then
    raise exception 'Participant count must be 6 or fewer.';
  end if;

  select coalesce(array_agg(c.id order by requested.first_order), array[]::uuid[])
    into v_participant_ids
  from (
    select character_id, min(ordinality) as first_order
    from unnest(coalesce(p_participant_ids, array[]::uuid[]))
      with ordinality as p(character_id, ordinality)
    group by character_id
  ) requested
  join public.characters c on c.id = requested.character_id
  where c.owner_id = p_published_by
    and c.visibility = 'public';

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

  delete from public.act_participants ap
  where ap.act_id = v_act_id
    and exists (
      select 1
      from public.characters c
      where c.id = ap.character_id
        and c.owner_id = p_published_by
    )
    and not (ap.character_id = any(v_participant_ids));

  insert into public.act_participants (
    act_id, character_id, character_public_id, character_name, player_name, cast_order
  )
  select
    v_act_id, c.id, c.public_id, c.character_name, coalesce(c.player_name, ''),
    p.ordinality::smallint
  from unnest(v_participant_ids) with ordinality as p(character_id, ordinality)
  join public.characters c on c.id = p.character_id
  where c.owner_id = p_published_by
    and c.visibility = 'public'
  on conflict (act_id, character_id) do update set
    character_public_id = excluded.character_public_id,
    character_name = excluded.character_name,
    player_name = excluded.player_name,
    cast_order = excluded.cast_order;

  return v_act_id;
end;
$$;

-- Retained for compatibility with the Edge Function's history mode.
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
  v_participant_ids uuid[];
begin
  if p_recorded_by is null then
    raise exception 'Recorder identity is required.' using errcode = '28000';
  end if;

  if coalesce(cardinality(p_participant_ids), 0) > 6 then
    raise exception 'Participant count must be 6 or fewer.';
  end if;

  select coalesce(array_agg(c.id order by requested.first_order), array[]::uuid[])
    into v_participant_ids
  from (
    select character_id, min(ordinality) as first_order
    from unnest(coalesce(p_participant_ids, array[]::uuid[]))
      with ordinality as p(character_id, ordinality)
    group by character_id
  ) requested
  join public.characters c on c.id = requested.character_id
  where c.owner_id = p_recorded_by
    and c.visibility = 'public';

  if cardinality(v_participant_ids) < 1 then
    raise exception 'No owned public participant characters were supplied.';
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

  delete from public.act_participants ap
  where ap.act_id = v_act_id
    and exists (
      select 1
      from public.characters c
      where c.id = ap.character_id
        and c.owner_id = p_recorded_by
    )
    and not (ap.character_id = any(v_participant_ids));

  insert into public.act_participants (
    act_id, character_id, character_public_id, character_name, player_name, cast_order
  )
  select
    v_act_id, c.id, c.public_id, c.character_name, coalesce(c.player_name, ''),
    p.ordinality::smallint
  from unnest(v_participant_ids) with ordinality as p(character_id, ordinality)
  join public.characters c on c.id = p.character_id
  where c.owner_id = p_recorded_by
    and c.visibility = 'public'
  on conflict (act_id, character_id) do update set
    character_public_id = excluded.character_public_id,
    character_name = excluded.character_name,
    player_name = excluded.player_name,
    cast_order = excluded.cast_order;

  return v_act_id;
end;
$$;

-- Reassert that earned experience can only be updated for an owned character.
drop policy if exists act_participants_update_owner on public.act_participants;
create policy act_participants_update_owner
on public.act_participants
for update
to authenticated
using (
  exists (
    select 1
    from public.characters c
    where c.id = act_participants.character_id
      and c.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.characters c
    where c.id = act_participants.character_id
      and c.owner_id = auth.uid()
  )
);

revoke all on function public.record_act_history_for_current_user(text, text, text, uuid[]) from public;
grant execute on function public.record_act_history_for_current_user(text, text, text, uuid[]) to authenticated;
revoke all on function public.record_act_publication(text, text, text, text, uuid, uuid[]) from public;
grant execute on function public.record_act_publication(text, text, text, text, uuid, uuid[]) to service_role;
revoke all on function public.record_act_history(text, text, text, uuid, uuid[]) from public;
grant execute on function public.record_act_history(text, text, text, uuid, uuid[]) to service_role;

revoke all on table public.act_participants from anon, authenticated;
grant select on table public.act_participants to authenticated;
grant update (earned_experience) on table public.act_participants to authenticated;

notify pgrst, 'reload schema';
commit;
