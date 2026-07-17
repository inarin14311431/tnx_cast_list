begin;

alter table public.characters
  drop constraint if exists characters_visibility_check;

alter table public.characters
  add constraint characters_visibility_check
  check (visibility in ('draft', 'public', 'private', 'archived'));

notify pgrst, 'reload schema';

commit;
