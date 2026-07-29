begin;

alter table public.acts
  add column if not exists showcase_data jsonb,
  add column if not exists showcase_public boolean not null default false,
  add column if not exists showcase_updated_at timestamptz;

create or replace function public.publish_act_showcase_for_current_user(
  p_slug text,
  p_act_name text,
  p_ruler_name text,
  p_showcase_data jsonb,
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
  v_payload_size integer;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;

  if p_showcase_data is null or jsonb_typeof(p_showcase_data) <> 'object' then
    raise exception 'Showcase data must be a JSON object.';
  end if;

  v_payload_size := octet_length(p_showcase_data::text);
  if v_payload_size > 524288 then
    raise exception 'Showcase data is too large.';
  end if;

  if coalesce(jsonb_array_length(coalesce(p_showcase_data->'casts', '[]'::jsonb)), 0) < 1
     or coalesce(jsonb_array_length(coalesce(p_showcase_data->'casts', '[]'::jsonb)), 0) > 6 then
    raise exception 'Showcase cast count must be between 1 and 6.';
  end if;

  select public.record_act_history_for_current_user(
    p_slug,
    p_act_name,
    p_ruler_name,
    p_participant_ids
  ) into v_act_id;

  update public.acts
  set showcase_data = p_showcase_data,
      showcase_public = true,
      showcase_updated_at = now(),
      public_url = './act-showcase.html?id=' || p_slug
  where id = v_act_id
    and published_by = v_user_id;

  if not found then
    raise exception 'Act showcase could not be updated.' using errcode = '42501';
  end if;

  return v_act_id;
end;
$$;

revoke all on function public.publish_act_showcase_for_current_user(text, text, text, jsonb, uuid[]) from public;
grant execute on function public.publish_act_showcase_for_current_user(text, text, text, jsonb, uuid[]) to authenticated;

create or replace function public.get_public_act_showcase(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select a.showcase_data
  from public.acts a
  where a.slug = p_slug
    and a.showcase_public = true
    and a.showcase_data is not null
  limit 1;
$$;

revoke all on function public.get_public_act_showcase(text) from public;
grant execute on function public.get_public_act_showcase(text) to anon, authenticated;

notify pgrst, 'reload schema';
commit;
