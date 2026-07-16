begin;

alter table public.characters
  add column if not exists style_1_attribute text not null default '',
  add column if not exists style_2_attribute text not null default '',
  add column if not exists style_3_attribute text not null default '';

notify pgrst, 'reload schema';
commit;
