begin;

alter table public.characters
  add column if not exists handle_kana text not null default '';

notify pgrst, 'reload schema';
commit;
