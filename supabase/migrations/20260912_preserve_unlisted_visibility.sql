-- Preserve all supported character visibility states when saving a character bundle.
-- The previous function normalized every non-public value to private, which meant
-- `unlisted` was lost immediately after save/reload.

do $migration$
declare
  v_definition text;
  v_old text := 'case when p_character->>''visibility'' = ''public'' then ''public'' else ''private'' end';
  v_new text := 'case when p_character->>''visibility'' in (''public'', ''unlisted'') then p_character->>''visibility'' else ''private'' end';
  v_occurrences integer;
begin
  select pg_get_functiondef(p.oid)
    into v_definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'save_character_bundle'
  limit 1;

  if v_definition is null then
    raise exception 'public.save_character_bundle was not found';
  end if;

  v_occurrences := (length(v_definition) - length(replace(v_definition, v_old, ''))) / length(v_old);
  if v_occurrences <> 2 then
    raise exception 'Expected 2 legacy visibility normalizers, found %', v_occurrences;
  end if;

  v_definition := replace(v_definition, v_old, v_new);
  execute v_definition;
end
$migration$;
