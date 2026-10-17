-- Snapshot restore must go through save_character_bundle_with_ofc.
--
-- Why: restore_character_snapshot called public.save_character_bundle directly. Normal saves use
-- save_character_bundle_with_ofc, which calls save_character_bundle and then writes the two things
-- save_character_bundle does not know about:
--   1. characters.character_sheet_url
--   2. character_outfits.ofc_details (save_character_bundle deletes and re-inserts every outfit
--      without that column, so it falls back to the default '{}')
-- A restore therefore left the sheet URL at its current value and wiped the OFC details of every
-- restored outfit. Snapshot creation already stores both (character_sheet_url inside "character",
-- ofc_details inside each "outfits" element), so only the restore side is wrong.
--
-- Change: restore_character_snapshot now calls save_character_bundle_with_ofc.
--
-- Old snapshots (taken before character_sheet_url was added, 6 rows as of 2026-10-17) have no
-- character_sheet_url key. save_character_bundle_with_ofc writes coalesce(key, '') and would blank
-- the URL, so when the stored value is not a string the character's CURRENT URL is injected into
-- the payload instead and the URL is left unchanged. A stored empty string is a real value and is
-- restored as-is.
--
-- Outfits without an ofc_details key (none in the live snapshots as of 2026-10-17) get '{}' from
-- save_character_bundle_with_ofc, which equals the column default and the pre-OFC state.
--
-- Signature, security invoker, search_path and grants are unchanged (create or replace keeps the
-- existing ACL: authenticated and service_role only). Live application needs explicit owner
-- approval. Rollback is re-creating the previous body from supabase/11_character_snapshots.sql.

create or replace function public.restore_character_snapshot(p_snapshot_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_snapshot public.character_snapshots%rowtype;
  v_character jsonb;
  v_skills jsonb;
  v_outfits jsonb;
  v_current_url text;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;

  select * into v_snapshot
  from public.character_snapshots
  where id = p_snapshot_id and owner_id = v_user_id;

  if not found then
    raise exception 'Snapshot not found.' using errcode = '42501';
  end if;

  v_character := v_snapshot.snapshot_data->'character';
  v_skills := coalesce(v_snapshot.snapshot_data->'skills', '[]'::jsonb);
  v_outfits := coalesce(v_snapshot.snapshot_data->'outfits', '[]'::jsonb);

  -- Snapshots without a character_sheet_url string keep the current URL.
  if jsonb_typeof(v_character) = 'object'
     and jsonb_typeof(v_character->'character_sheet_url') is distinct from 'string' then
    select c.character_sheet_url into v_current_url
    from public.characters as c
    where c.id = v_snapshot.character_id and c.owner_id = v_user_id;

    v_character := v_character
      || jsonb_build_object('character_sheet_url', coalesce(v_current_url, ''));
  end if;

  -- Same transactional save contract as a normal save. Identity/ownership values in the stored
  -- character object are ignored by save_character_bundle.
  select public.save_character_bundle_with_ofc(v_snapshot.character_id, v_character, v_skills, v_outfits)
    into v_result;

  return v_result;
end;
$$;
