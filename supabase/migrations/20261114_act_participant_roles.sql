-- Act history 参加枠 (act_participants.participation_role) is saved together with CAST No.
--
-- Why: the generator used to write the role (the "quote" select of each row, the handout / style slot the cast plays) with a client-side
-- wrapper around record_act_history_for_current_user and the old publish-showcase function. Publishing now goes through
-- publish_act_showcase_for_current_user, which the wrapper never covered, so every act published since 2026-09-08 has an empty
-- participation_role. The wrapper is removed; the generator now sends the role in the same owner-scoped call that already
-- stores CAST No, right after publishing or recording history.
--
-- Change: set_act_participant_cast_orders_for_current_user(p_slug, p_orders) reads an optional "participationRole" string from each
-- item next to "castOrder" and stores it (trimmed, at most 80 characters, the column's length check). Both keys are optional per
-- item: an item without "participationRole" leaves the stored role as it is (so a client that only sends castOrder changes nothing
-- else), an item without a valid "castOrder" leaves cast_order as it is. An empty role string clears the role. Same ownership rule
-- as before: only participant rows of an act published by the caller are touched; the signature, the grants and the other RPCs are unchanged.
--
-- Rollback: re-create the function as in migrations/20261017_act_participant_cast_orders.sql.
--
-- Live application needs explicit owner approval. Until it is applied, the generator's call still succeeds and the role is not saved.

create or replace function public.set_act_participant_cast_orders_for_current_user(
  p_slug text,
  p_orders jsonb
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_act_id uuid;
  v_updated integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;
  if p_orders is null or jsonb_typeof(p_orders) <> 'array' or jsonb_array_length(p_orders) > 6 then
    raise exception 'Cast orders must be an array of at most 6 items.' using errcode = '22023';
  end if;

  select a.id into v_act_id
  from public.acts a
  where a.slug = p_slug
    and a.published_by = v_user_id;
  if v_act_id is null then
    raise exception 'Act not found or owned by another user.' using errcode = '42501';
  end if;

  with requested as (
    select case when item->>'characterId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                then (item->>'characterId')::uuid end as character_id,
           case when item->>'castOrder' ~ '^[1-6]$' then (item->>'castOrder')::smallint end as cast_order,
           -- null (leave the stored role) unless the item carries a string; '' clears it
           case when jsonb_typeof(item->'participationRole') = 'string'
                then left(btrim(item->>'participationRole'), 80) end as participation_role
    from jsonb_array_elements(p_orders) as item
    where jsonb_typeof(item) = 'object'
  )
  update public.act_participants ap
  set cast_order = coalesce(r.cast_order, ap.cast_order),
      participation_role = coalesce(r.participation_role, ap.participation_role)
  from requested r
  where ap.act_id = v_act_id
    and ap.character_id = r.character_id
    and (r.cast_order is not null or r.participation_role is not null)
    and (ap.cast_order is distinct from coalesce(r.cast_order, ap.cast_order)
         or ap.participation_role is distinct from coalesce(r.participation_role, ap.participation_role));

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

revoke all on function public.set_act_participant_cast_orders_for_current_user(text, jsonb) from public;
revoke all on function public.set_act_participant_cast_orders_for_current_user(text, jsonb) from anon;
grant execute on function public.set_act_participant_cast_orders_for_current_user(text, jsonb) to authenticated;
