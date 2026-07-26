begin;

-- Existing separator rows may have been saved before the UI forced skill_kind=none.
update public.character_skills
set skill_kind = 'none'
where category = 'style'
  and position('[[STYLE_SEPARATOR]]' in coalesce(description, '')) > 0
  and skill_kind is distinct from 'none';

-- Keep separator rows at kind=none regardless of which client or import path writes them.
create or replace function public.enforce_style_separator_none()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.category = 'style'
     and position('[[STYLE_SEPARATOR]]' in coalesce(new.description, '')) > 0 then
    new.skill_kind := 'none';
  end if;
  return new;
end;
$$;

drop trigger if exists character_skills_style_separator_none
on public.character_skills;

create trigger character_skills_style_separator_none
before insert or update of category, description, skill_kind
on public.character_skills
for each row
execute function public.enforce_style_separator_none();

notify pgrst, 'reload schema';
commit;
