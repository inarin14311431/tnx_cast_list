-- characters.updated_at must not move when only image_thumbnail_url changes.
--
-- Why: the live trigger characters_set_updated_at (BEFORE UPDATE ON public.characters, calling
-- public.set_updated_at()) set updated_at = now() on every UPDATE. scripts/regenerate-thumbnails.mjs
-- only writes image_thumbnail_url, but running it against the shared project still rewrote
-- updated_at of every target row, which reorders the "recently updated" lists. (The trigger and
-- set_updated_at() were created before migration history was tracked; they are not defined in any
-- earlier file in this repository. Live definition confirmed on 2026-10-16: public.set_updated_at()
-- is plpgsql, search_path = public, pg_temp, body `new.updated_at = now(); return new;`, and
-- characters_set_updated_at is its only user.)
--
-- Change: add a characters-specific trigger function that skips the updated_at bump only for an
-- UPDATE that changes image_thumbnail_url and nothing else (old/new compared as jsonb with that
-- key removed), and point the trigger at it. Browser image uploads also change image_url, so they
-- still bump updated_at exactly as before. Every other UPDATE, including one that changes nothing,
-- behaves exactly as before.
--
-- public.set_updated_at() is left untouched, so rollback is just re-pointing the trigger:
--   drop trigger if exists characters_set_updated_at on public.characters;
--   create trigger characters_set_updated_at before update on public.characters
--     for each row execute function public.set_updated_at();
--   drop function if exists public.characters_touch_updated_at();
--
-- Live application needs explicit owner approval (docs/THUMBNAIL_REGENERATION.md). Verify after
-- applying (run inside a transaction and roll back, or on a throwaway row):
--   select pg_get_triggerdef(oid) from pg_trigger
--    where tgrelid = 'public.characters'::regclass and tgname = 'characters_set_updated_at';

create or replace function public.characters_touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.image_thumbnail_url is distinct from old.image_thumbnail_url
     and (to_jsonb(new) - 'image_thumbnail_url') is not distinct from (to_jsonb(old) - 'image_thumbnail_url') then
    return new;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger functions are never called directly; keep them out of the client-callable surface.
revoke all on function public.characters_touch_updated_at() from public, anon, authenticated;

drop trigger if exists characters_set_updated_at on public.characters;
create trigger characters_set_updated_at
  before update on public.characters
  for each row execute function public.characters_touch_updated_at();
