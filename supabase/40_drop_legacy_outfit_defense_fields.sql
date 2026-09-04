begin;

-- Retire outfit columns whose canonical data has already moved elsewhere.
-- defense          -> ofc_details.defense_s / defense_p / defense_i
-- mundane_modifier -> retired; current outfit contract does not emit it
--
-- Safety rules:
-- 1. Abort instead of discarding any unexpected legacy value.
-- 2. Rewrite only the outfit INSERT portion of save_character_bundle.
-- 3. Verify the rewritten function no longer refers to the retired fields.
-- 4. Drop the columns only after all checks pass.
do $$
begin
  if exists (
    select 1
    from public.character_outfits
    where nullif(btrim(coalesce(defense, '')), '') is not null
  ) then
    raise exception 'Non-empty legacy defense values remain; aborting column removal.';
  end if;

  if exists (
    select 1
    from public.character_outfits
    where coalesce(mundane_modifier, 0) <> 0
  ) then
    raise exception 'Non-zero legacy mundane_modifier values remain; aborting column removal.';
  end if;
end $$;

do $$
declare
  v_definition text;
  v_updated text;
begin
  select replace(
    pg_get_functiondef('public.save_character_bundle(uuid,jsonb,jsonb,jsonb)'::regprocedure),
    E'\r\n',
    E'\n'
  ) into v_definition;

  v_updated := replace(
    v_definition,
$old$    concealment, attack, defense, range, slot, description,
    control_modifier, cs_modifier, mundane_modifier, sort_order$old$,
$new$    concealment, attack, range, slot, description,
    control_modifier, cs_modifier, sort_order$new$
  );

  v_updated := replace(
    v_updated,
$old$    coalesce(x.concealment, ''), coalesce(x.attack, ''), coalesce(x.defense, ''), coalesce(x.range, ''), coalesce(x.slot, ''), coalesce(x.description, ''),
    coalesce(x.control_modifier, 0), coalesce(x.cs_modifier, 0), coalesce(x.mundane_modifier, 0), coalesce(x.sort_order, 0)$old$,
$new$    coalesce(x.concealment, ''), coalesce(x.attack, ''), coalesce(x.range, ''), coalesce(x.slot, ''), coalesce(x.description, ''),
    coalesce(x.control_modifier, 0), coalesce(x.cs_modifier, 0), coalesce(x.sort_order, 0)$new$
  );

  v_updated := replace(
    v_updated,
$old$    concealment text, attack text, defense text, range text, slot text, description text,
    control_modifier integer, cs_modifier integer, mundane_modifier integer, sort_order integer$old$,
$new$    concealment text, attack text, range text, slot text, description text,
    control_modifier integer, cs_modifier integer, sort_order integer$new$
  );

  if v_updated = v_definition then
    raise exception 'save_character_bundle did not match the expected legacy outfit definition.';
  end if;

  if position('x.defense' in v_updated) > 0
     or position('x.mundane_modifier' in v_updated) > 0
     or position('concealment, attack, defense, range' in v_updated) > 0 then
    raise exception 'save_character_bundle still references a retired outfit field after rewrite.';
  end if;

  execute v_updated;
end $$;

alter table public.character_outfits
  drop column if exists defense,
  drop column if exists mundane_modifier;

notify pgrst, 'reload schema';
commit;
