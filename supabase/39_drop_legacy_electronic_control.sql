begin;

-- Retire the legacy top-level electronic_control column after preserving any
-- remaining legacy-only values in the canonical OFC detail object.
--
-- Safety rules:
-- 1. Never overwrite an existing canonical value.
-- 2. Abort if both locations contain conflicting non-empty values.
-- 3. Drop the legacy column only after the checks above pass.

update public.character_outfits
set ofc_details = jsonb_set(
  coalesce(ofc_details, '{}'::jsonb),
  '{electronic_control}',
  to_jsonb(btrim(electronic_control)),
  true
)
where nullif(btrim(coalesce(electronic_control, '')), '') is not null
  and nullif(btrim(coalesce(ofc_details->>'electronic_control', '')), '') is null;

do $$
begin
  if exists (
    select 1
    from public.character_outfits
    where nullif(btrim(coalesce(electronic_control, '')), '') is not null
      and nullif(btrim(coalesce(ofc_details->>'electronic_control', '')), '') is not null
      and btrim(electronic_control) <> btrim(ofc_details->>'electronic_control')
  ) then
    raise exception 'Conflicting electronic_control values remain; aborting legacy column removal.';
  end if;
end $$;

alter table public.character_outfits
  drop column if exists electronic_control;

notify pgrst, 'reload schema';
commit;
