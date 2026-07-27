begin;

-- Preserve the complete OFC catalogue fields without changing the existing
-- character_outfits columns used by older pages and backups.
alter table public.character_outfits
  add column if not exists ofc_details jsonb not null default '{}'::jsonb;

comment on column public.character_outfits.ofc_details is
  'Additional OFC catalogue fields such as manufacturer, parry, electronic control, IANUS/TRON/vehicle/residence values and source page.';

-- The existing save_character_bundle function remains the authoritative and
-- transactional save path for the character, skills and base outfit columns.
-- This wrapper stores the OFC detail object in the same transaction after the
-- base rows have been recreated.
create or replace function public.save_character_bundle_with_ofc(
  p_character_id uuid,
  p_character jsonb,
  p_skills jsonb,
  p_outfits jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_character jsonb;
  v_character_id uuid;
begin
  v_character := public.save_character_bundle(
    p_character_id,
    p_character,
    p_skills,
    p_outfits
  );

  v_character_id := nullif(v_character->>'id', '')::uuid;
  if v_character_id is null then
    raise exception 'Saved character ID could not be determined.';
  end if;

  update public.character_outfits as target
  set ofc_details = case
    when jsonb_typeof(source.item->'ofc_details') = 'object'
      then source.item->'ofc_details'
    else '{}'::jsonb
  end
  from (
    select
      item,
      coalesce(
        nullif(item->>'sort_order', '')::integer,
        ordinality::integer - 1
      ) as sort_order
    from jsonb_array_elements(coalesce(p_outfits, '[]'::jsonb))
      with ordinality as entries(item, ordinality)
    where btrim(coalesce(item->>'name', '')) <> ''
  ) as source
  where target.character_id = v_character_id
    and target.sort_order = source.sort_order;

  return v_character;
end;
$$;

revoke all on function public.save_character_bundle_with_ofc(uuid, jsonb, jsonb, jsonb) from public;
grant execute on function public.save_character_bundle_with_ofc(uuid, jsonb, jsonb, jsonb) to authenticated;

notify pgrst, 'reload schema';
commit;
