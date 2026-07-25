begin;

-- The current application supports only two visibility states.
-- Convert legacy values before enforcing the two-state constraint.
update public.characters
set visibility = 'private'
where visibility is null
   or visibility not in ('public', 'private');

alter table public.characters
  alter column visibility set default 'private',
  alter column visibility set not null;

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'public.characters'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%visibility%'
  loop
    execute format(
      'alter table public.characters drop constraint %I',
      constraint_record.conname
    );
  end loop;
end;
$$;

alter table public.characters
  add constraint characters_visibility_check
  check (visibility in ('public', 'private'));

notify pgrst, 'reload schema';
commit;
