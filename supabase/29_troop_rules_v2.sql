-- Troop v2: one style, derived abilities, maximum members only, spent EXP and combos.
alter table public.troops add column if not exists utsuwa_attribute text not null default '';
alter table public.troops add column if not exists combos jsonb not null default '[]'::jsonb;
alter table public.troops add column if not exists experience_spent integer not null default 0;

alter table public.troops drop constraint if exists troops_experience_spent_check;
alter table public.troops add constraint troops_experience_spent_check check (experience_spent >= 0);
alter table public.troops drop constraint if exists troop_combos_array;
alter table public.troops add constraint troop_combos_array check (jsonb_typeof(combos) = 'array');

comment on column public.troops.style_1 is 'Canonical single troop style. style_2/style_3 remain legacy compatibility fields.';
comment on column public.troops.member_current is 'Legacy compatibility only. Troop v2 UI manages member_max only.';
comment on column public.troops.combos is 'Act-use combo registrations for this troop.';
comment on column public.troops.experience_spent is 'Calculated spent experience from general and style skills.';
