begin;

alter table public.characters
  drop constraint if exists characters_visibility_check;

update public.characters
set visibility = case
  when visibility = 'public' then 'public'
  else 'private'
end;

alter table public.characters
  alter column visibility set default 'private',
  alter column visibility set not null;

alter table public.characters
  add constraint characters_visibility_check
  check (visibility in ('public','private'));

notify pgrst, 'reload schema';

commit;
