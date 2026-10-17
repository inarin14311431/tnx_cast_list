-- Act history CAST No. (act_participants.cast_order) follows the generator's CAST No.
--
-- Why: record_act_history_for_current_user numbers participants by their position in
-- p_participant_ids (with ordinality). That array only holds the publisher's own registered casts,
-- so manual (unregistered) casts and the CAST No set in the generator are lost: an act shown as
-- CAST 01 manual / CAST 02 registered / CAST 03 manual recorded the registered cast as CAST 01.
--
-- Change: a separate owner-scoped RPC the generator calls right after publishing or recording
-- history, with the CAST No of each registered cast. It only updates cast_order of participant
-- rows that belong to an act published by the caller; existing RPCs are untouched.
--
-- Rollback: drop function if exists public.set_act_participant_cast_orders_for_current_user(text, jsonb);
--
-- Live application needs explicit owner approval.

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
           case when item->>'castOrder' ~ '^[1-6]$' then (item->>'castOrder')::integer end as cast_order
    from jsonb_array_elements(p_orders) as item
    where jsonb_typeof(item) = 'object'
  )
  update public.act_participants ap
  set cast_order = r.cast_order::smallint
  from requested r
  where ap.act_id = v_act_id
    and ap.character_id = r.character_id
    and r.cast_order is not null
    and ap.cast_order is distinct from r.cast_order::smallint;

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

revoke all on function public.set_act_participant_cast_orders_for_current_user(text, jsonb) from public;
revoke all on function public.set_act_participant_cast_orders_for_current_user(text, jsonb) from anon;
grant execute on function public.set_act_participant_cast_orders_for_current_user(text, jsonb) to authenticated;
