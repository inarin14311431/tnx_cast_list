begin;

-- The sheet editor saves the character row, skills and outfits as one database
-- transaction. Any error rolls the whole operation back, so an interrupted save
-- cannot leave the child tables empty or only partially rebuilt.

alter table public.characters
  add column if not exists style_1_attribute text not null default '',
  add column if not exists style_2_attribute text not null default '',
  add column if not exists style_3_attribute text not null default '',
  add column if not exists age text not null default '',
  add column if not exists gender text not null default '',
  add column if not exists height text not null default '',
  add column if not exists weight text not null default '',
  add column if not exists eyes text not null default '',
  add column if not exists hair text not null default '',
  add column if not exists skin text not null default '',
  add column if not exists life_path_origin text not null default '',
  add column if not exists life_path_experience text not null default '',
  add column if not exists life_path_encounter text not null default '';

create or replace function public.save_character_bundle(
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
  v_user_id uuid := auth.uid();
  v_character public.characters%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;

  if p_character is null or jsonb_typeof(p_character) <> 'object' then
    raise exception 'Character payload must be a JSON object.' using errcode = '22023';
  end if;
  if coalesce(jsonb_typeof(p_skills), 'array') <> 'array' then
    raise exception 'Skills payload must be a JSON array.' using errcode = '22023';
  end if;
  if coalesce(jsonb_typeof(p_outfits), 'array') <> 'array' then
    raise exception 'Outfits payload must be a JSON array.' using errcode = '22023';
  end if;
  if btrim(coalesce(p_character->>'character_name', '')) = '' then
    raise exception 'Character name is required.' using errcode = '22023';
  end if;
  if btrim(coalesce(p_character->>'player_name', '')) = '' then
    raise exception 'Player name is required.' using errcode = '22023';
  end if;

  if p_character_id is null then
    insert into public.characters (
      owner_id,
      character_name, character_kana, handle, handle_kana, player_name,
      affiliation, citizen_rank, summary, profile, visibility, experience_points,
      style_1, style_1_mark, style_1_attribute, divine_1, divine_1_yomi,
      style_2, style_2_mark, style_2_attribute, divine_2, divine_2_yomi,
      style_3, style_3_mark, style_3_attribute, divine_3, divine_3_yomi,
      reason_base, reason_growth, reason_gear, reason_manual, reason_value,
      reason_control_base, reason_control_growth, reason_control_gear, reason_control_manual, reason_control,
      passion_base, passion_growth, passion_gear, passion_manual, passion_value,
      passion_control_base, passion_control_growth, passion_control_gear, passion_control_manual, passion_control,
      life_base, life_growth, life_gear, life_manual, life_value,
      life_control_base, life_control_growth, life_control_gear, life_control_manual, life_control,
      mundane_base, mundane_growth, mundane_gear, mundane_manual, mundane_value,
      mundane_control_base, mundane_control_growth, mundane_control_gear, mundane_control_manual, mundane_control,
      cs_base, cs_gear, cs_manual, cs,
      age, gender, height, weight, eyes, hair, skin,
      life_path_origin, life_path_experience, life_path_encounter
    ) values (
      v_user_id,
      btrim(coalesce(p_character->>'character_name', '')),
      coalesce(p_character->>'character_kana', ''),
      coalesce(p_character->>'handle', ''),
      coalesce(p_character->>'handle_kana', ''),
      btrim(coalesce(p_character->>'player_name', '')),
      coalesce(p_character->>'affiliation', ''),
      coalesce(p_character->>'citizen_rank', ''),
      coalesce(p_character->>'summary', ''),
      coalesce(p_character->>'profile', ''),
      case when p_character->>'visibility' = 'public' then 'public' else 'private' end,
      coalesce((p_character->>'experience_points')::integer, 0),
      coalesce(p_character->>'style_1', ''), coalesce(p_character->>'style_1_mark', ''), coalesce(p_character->>'style_1_attribute', ''), coalesce(p_character->>'divine_1', ''), coalesce(p_character->>'divine_1_yomi', ''),
      coalesce(p_character->>'style_2', ''), coalesce(p_character->>'style_2_mark', ''), coalesce(p_character->>'style_2_attribute', ''), coalesce(p_character->>'divine_2', ''), coalesce(p_character->>'divine_2_yomi', ''),
      coalesce(p_character->>'style_3', ''), coalesce(p_character->>'style_3_mark', ''), coalesce(p_character->>'style_3_attribute', ''), coalesce(p_character->>'divine_3', ''), coalesce(p_character->>'divine_3_yomi', ''),
      coalesce((p_character->>'reason_base')::integer, 0), coalesce((p_character->>'reason_growth')::integer, 0), coalesce((p_character->>'reason_gear')::integer, 0), coalesce((p_character->>'reason_manual')::integer, 0), coalesce((p_character->>'reason_value')::integer, 0),
      coalesce((p_character->>'reason_control_base')::integer, 0), coalesce((p_character->>'reason_control_growth')::integer, 0), coalesce((p_character->>'reason_control_gear')::integer, 0), coalesce((p_character->>'reason_control_manual')::integer, 0), coalesce((p_character->>'reason_control')::integer, 0),
      coalesce((p_character->>'passion_base')::integer, 0), coalesce((p_character->>'passion_growth')::integer, 0), coalesce((p_character->>'passion_gear')::integer, 0), coalesce((p_character->>'passion_manual')::integer, 0), coalesce((p_character->>'passion_value')::integer, 0),
      coalesce((p_character->>'passion_control_base')::integer, 0), coalesce((p_character->>'passion_control_growth')::integer, 0), coalesce((p_character->>'passion_control_gear')::integer, 0), coalesce((p_character->>'passion_control_manual')::integer, 0), coalesce((p_character->>'passion_control')::integer, 0),
      coalesce((p_character->>'life_base')::integer, 0), coalesce((p_character->>'life_growth')::integer, 0), coalesce((p_character->>'life_gear')::integer, 0), coalesce((p_character->>'life_manual')::integer, 0), coalesce((p_character->>'life_value')::integer, 0),
      coalesce((p_character->>'life_control_base')::integer, 0), coalesce((p_character->>'life_control_growth')::integer, 0), coalesce((p_character->>'life_control_gear')::integer, 0), coalesce((p_character->>'life_control_manual')::integer, 0), coalesce((p_character->>'life_control')::integer, 0),
      coalesce((p_character->>'mundane_base')::integer, 0), coalesce((p_character->>'mundane_growth')::integer, 0), coalesce((p_character->>'mundane_gear')::integer, 0), coalesce((p_character->>'mundane_manual')::integer, 0), coalesce((p_character->>'mundane_value')::integer, 0),
      coalesce((p_character->>'mundane_control_base')::integer, 0), coalesce((p_character->>'mundane_control_growth')::integer, 0), coalesce((p_character->>'mundane_control_gear')::integer, 0), coalesce((p_character->>'mundane_control_manual')::integer, 0), coalesce((p_character->>'mundane_control')::integer, 0),
      coalesce((p_character->>'cs_base')::integer, 0), coalesce((p_character->>'cs_gear')::integer, 0), coalesce((p_character->>'cs_manual')::integer, 0), coalesce((p_character->>'cs')::integer, 0),
      coalesce(p_character->>'age', ''), coalesce(p_character->>'gender', ''), coalesce(p_character->>'height', ''), coalesce(p_character->>'weight', ''), coalesce(p_character->>'eyes', ''), coalesce(p_character->>'hair', ''), coalesce(p_character->>'skin', ''),
      coalesce(p_character->>'life_path_origin', ''), coalesce(p_character->>'life_path_experience', ''), coalesce(p_character->>'life_path_encounter', '')
    )
    returning * into v_character;
  else
    update public.characters set
      character_name = btrim(coalesce(p_character->>'character_name', '')),
      character_kana = coalesce(p_character->>'character_kana', ''),
      handle = coalesce(p_character->>'handle', ''),
      handle_kana = coalesce(p_character->>'handle_kana', ''),
      player_name = btrim(coalesce(p_character->>'player_name', '')),
      affiliation = coalesce(p_character->>'affiliation', ''),
      citizen_rank = coalesce(p_character->>'citizen_rank', ''),
      summary = coalesce(p_character->>'summary', ''),
      profile = coalesce(p_character->>'profile', ''),
      visibility = case when p_character->>'visibility' = 'public' then 'public' else 'private' end,
      experience_points = coalesce((p_character->>'experience_points')::integer, 0),
      style_1 = coalesce(p_character->>'style_1', ''), style_1_mark = coalesce(p_character->>'style_1_mark', ''), style_1_attribute = coalesce(p_character->>'style_1_attribute', ''), divine_1 = coalesce(p_character->>'divine_1', ''), divine_1_yomi = coalesce(p_character->>'divine_1_yomi', ''),
      style_2 = coalesce(p_character->>'style_2', ''), style_2_mark = coalesce(p_character->>'style_2_mark', ''), style_2_attribute = coalesce(p_character->>'style_2_attribute', ''), divine_2 = coalesce(p_character->>'divine_2', ''), divine_2_yomi = coalesce(p_character->>'divine_2_yomi', ''),
      style_3 = coalesce(p_character->>'style_3', ''), style_3_mark = coalesce(p_character->>'style_3_mark', ''), style_3_attribute = coalesce(p_character->>'style_3_attribute', ''), divine_3 = coalesce(p_character->>'divine_3', ''), divine_3_yomi = coalesce(p_character->>'divine_3_yomi', ''),
      reason_base = coalesce((p_character->>'reason_base')::integer, 0), reason_growth = coalesce((p_character->>'reason_growth')::integer, 0), reason_gear = coalesce((p_character->>'reason_gear')::integer, 0), reason_manual = coalesce((p_character->>'reason_manual')::integer, 0), reason_value = coalesce((p_character->>'reason_value')::integer, 0),
      reason_control_base = coalesce((p_character->>'reason_control_base')::integer, 0), reason_control_growth = coalesce((p_character->>'reason_control_growth')::integer, 0), reason_control_gear = coalesce((p_character->>'reason_control_gear')::integer, 0), reason_control_manual = coalesce((p_character->>'reason_control_manual')::integer, 0), reason_control = coalesce((p_character->>'reason_control')::integer, 0),
      passion_base = coalesce((p_character->>'passion_base')::integer, 0), passion_growth = coalesce((p_character->>'passion_growth')::integer, 0), passion_gear = coalesce((p_character->>'passion_gear')::integer, 0), passion_manual = coalesce((p_character->>'passion_manual')::integer, 0), passion_value = coalesce((p_character->>'passion_value')::integer, 0),
      passion_control_base = coalesce((p_character->>'passion_control_base')::integer, 0), passion_control_growth = coalesce((p_character->>'passion_control_growth')::integer, 0), passion_control_gear = coalesce((p_character->>'passion_control_gear')::integer, 0), passion_control_manual = coalesce((p_character->>'passion_control_manual')::integer, 0), passion_control = coalesce((p_character->>'passion_control')::integer, 0),
      life_base = coalesce((p_character->>'life_base')::integer, 0), life_growth = coalesce((p_character->>'life_growth')::integer, 0), life_gear = coalesce((p_character->>'life_gear')::integer, 0), life_manual = coalesce((p_character->>'life_manual')::integer, 0), life_value = coalesce((p_character->>'life_value')::integer, 0),
      life_control_base = coalesce((p_character->>'life_control_base')::integer, 0), life_control_growth = coalesce((p_character->>'life_control_growth')::integer, 0), life_control_gear = coalesce((p_character->>'life_control_gear')::integer, 0), life_control_manual = coalesce((p_character->>'life_control_manual')::integer, 0), life_control = coalesce((p_character->>'life_control')::integer, 0),
      mundane_base = coalesce((p_character->>'mundane_base')::integer, 0), mundane_growth = coalesce((p_character->>'mundane_growth')::integer, 0), mundane_gear = coalesce((p_character->>'mundane_gear')::integer, 0), mundane_manual = coalesce((p_character->>'mundane_manual')::integer, 0), mundane_value = coalesce((p_character->>'mundane_value')::integer, 0),
      mundane_control_base = coalesce((p_character->>'mundane_control_base')::integer, 0), mundane_control_growth = coalesce((p_character->>'mundane_control_growth')::integer, 0), mundane_control_gear = coalesce((p_character->>'mundane_control_gear')::integer, 0), mundane_control_manual = coalesce((p_character->>'mundane_control_manual')::integer, 0), mundane_control = coalesce((p_character->>'mundane_control')::integer, 0),
      cs_base = coalesce((p_character->>'cs_base')::integer, 0), cs_gear = coalesce((p_character->>'cs_gear')::integer, 0), cs_manual = coalesce((p_character->>'cs_manual')::integer, 0), cs = coalesce((p_character->>'cs')::integer, 0),
      age = coalesce(p_character->>'age', ''), gender = coalesce(p_character->>'gender', ''), height = coalesce(p_character->>'height', ''), weight = coalesce(p_character->>'weight', ''), eyes = coalesce(p_character->>'eyes', ''), hair = coalesce(p_character->>'hair', ''), skin = coalesce(p_character->>'skin', ''),
      life_path_origin = coalesce(p_character->>'life_path_origin', ''), life_path_experience = coalesce(p_character->>'life_path_experience', ''), life_path_encounter = coalesce(p_character->>'life_path_encounter', '')
    where id = p_character_id
      and owner_id = v_user_id
    returning * into v_character;

    if not found then
      raise exception 'The character does not exist or is not owned by the current user.' using errcode = '42501';
    end if;
  end if;

  delete from public.character_skills where character_id = v_character.id;

  insert into public.character_skills (
    character_id, category, name, level, free_level, skill_kind,
    reason, passion, life, mundane,
    timing, target, range, difficulty, confrontation, description, sort_order
  )
  select
    v_character.id,
    coalesce(x.category, 'general'),
    btrim(coalesce(x.name, '')),
    greatest(coalesce(x.level, 0), 0),
    least(greatest(coalesce(x.free_level, 0), 0), greatest(coalesce(x.level, 0), 0)),
    coalesce(x.skill_kind, 'general'),
    coalesce(x.reason, false), coalesce(x.passion, false), coalesce(x.life, false), coalesce(x.mundane, false),
    coalesce(x.timing, ''), coalesce(x.target, ''), coalesce(x.range, ''), coalesce(x.difficulty, ''), coalesce(x.confrontation, ''), coalesce(x.description, ''),
    coalesce(x.sort_order, 0)
  from jsonb_to_recordset(coalesce(p_skills, '[]'::jsonb)) as x(
    category text, name text, level integer, free_level integer, skill_kind text,
    reason boolean, passion boolean, life boolean, mundane boolean,
    timing text, target text, range text, difficulty text, confrontation text, description text, sort_order integer
  )
  where btrim(coalesce(x.name, '')) <> ''
    and coalesce(x.level, 0) > 0;

  delete from public.character_outfits where character_id = v_character.id;

  insert into public.character_outfits (
    character_id, category, name, purchase_value, experience_cost,
    concealment, attack, defense, range, slot, description,
    control_modifier, cs_modifier, mundane_modifier, sort_order
  )
  select
    v_character.id,
    coalesce(x.category, 'other'),
    btrim(coalesce(x.name, '')),
    coalesce(x.purchase_value, ''), greatest(coalesce(x.experience_cost, 0), 0),
    coalesce(x.concealment, ''), coalesce(x.attack, ''), coalesce(x.defense, ''), coalesce(x.range, ''), coalesce(x.slot, ''), coalesce(x.description, ''),
    coalesce(x.control_modifier, 0), coalesce(x.cs_modifier, 0), coalesce(x.mundane_modifier, 0), coalesce(x.sort_order, 0)
  from jsonb_to_recordset(coalesce(p_outfits, '[]'::jsonb)) as x(
    category text, name text, purchase_value text, experience_cost integer,
    concealment text, attack text, defense text, range text, slot text, description text,
    control_modifier integer, cs_modifier integer, mundane_modifier integer, sort_order integer
  )
  where btrim(coalesce(x.name, '')) <> '';

  return to_jsonb(v_character);
end;
$$;

revoke all on function public.save_character_bundle(uuid, jsonb, jsonb, jsonb) from public;
grant execute on function public.save_character_bundle(uuid, jsonb, jsonb, jsonb) to authenticated;

notify pgrst, 'reload schema';
commit;
