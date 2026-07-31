begin;

alter table public.characters
  add column if not exists birthplace text not null default 'Ｎ◎ＶＡ';

update public.characters
set birthplace = 'Ｎ◎ＶＡ'
where btrim(coalesce(birthplace, '')) = '';

commit;
