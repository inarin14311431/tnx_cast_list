alter table public.characters
  add column if not exists character_sheet_url text not null default '';

create or replace function public.save_character_bundle_with_ofc(
  p_character_id uuid,
  p_character jsonb,
  p_skills jsonb,
  p_outfits jsonb
)
returns jsonb
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
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

  update public.characters as target
  set character_sheet_url = coalesce(p_character->>'character_sheet_url', '')
  where target.id = v_character_id
    and target.owner_id = auth.uid();

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

  select to_jsonb(saved)
  into v_character
  from public.characters as saved
  where saved.id = v_character_id;

  return v_character;
end;
$function$;
