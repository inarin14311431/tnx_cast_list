begin;

alter table public.characters
  add column if not exists reason_base integer not null default 0,
  add column if not exists reason_growth integer not null default 0,
  add column if not exists reason_gear integer not null default 0,
  add column if not exists reason_manual integer not null default 0,
  add column if not exists reason_control_base integer not null default 0,
  add column if not exists reason_control_growth integer not null default 0,
  add column if not exists reason_control_gear integer not null default 0,
  add column if not exists reason_control_manual integer not null default 0,
  add column if not exists passion_base integer not null default 0,
  add column if not exists passion_growth integer not null default 0,
  add column if not exists passion_gear integer not null default 0,
  add column if not exists passion_manual integer not null default 0,
  add column if not exists passion_control_base integer not null default 0,
  add column if not exists passion_control_growth integer not null default 0,
  add column if not exists passion_control_gear integer not null default 0,
  add column if not exists passion_control_manual integer not null default 0,
  add column if not exists life_base integer not null default 0,
  add column if not exists life_growth integer not null default 0,
  add column if not exists life_gear integer not null default 0,
  add column if not exists life_manual integer not null default 0,
  add column if not exists life_control_base integer not null default 0,
  add column if not exists life_control_growth integer not null default 0,
  add column if not exists life_control_gear integer not null default 0,
  add column if not exists life_control_manual integer not null default 0,
  add column if not exists mundane_base integer not null default 0,
  add column if not exists mundane_growth integer not null default 0,
  add column if not exists mundane_gear integer not null default 0,
  add column if not exists mundane_manual integer not null default 0,
  add column if not exists mundane_control_base integer not null default 0,
  add column if not exists mundane_control_growth integer not null default 0,
  add column if not exists mundane_control_gear integer not null default 0,
  add column if not exists mundane_control_manual integer not null default 0,
  add column if not exists cs_base integer not null default 0,
  add column if not exists cs_gear integer not null default 0,
  add column if not exists cs_manual integer not null default 0,
  add column if not exists divine_1_yomi text not null default '',
  add column if not exists divine_2_yomi text not null default '',
  add column if not exists divine_3_yomi text not null default '';

alter table public.character_skills
  add column if not exists free_level integer not null default 0,
  add column if not exists skill_kind text not null default 'general';

alter table public.character_outfits
  add column if not exists control_modifier integer not null default 0,
  add column if not exists cs_modifier integer not null default 0,
  add column if not exists mundane_modifier integer not null default 0;

notify pgrst, 'reload schema';
commit;

-- 既存データを破棄して新仕様で作り直す場合のみ、以下を別途実行してください。
-- begin;
-- delete from public.character_combos;
-- delete from public.character_outfits;
-- delete from public.character_skills;
-- delete from public.characters;
-- commit;
