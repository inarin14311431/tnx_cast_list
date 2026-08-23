begin;

-- Keep all existing RLS policies and application CRUD permissions intact.
-- Browser/PostgREST clients do not require these schema-level privileges.
revoke truncate, references, trigger on table public.characters from anon, authenticated;
revoke truncate, references, trigger on table public.character_skills from anon, authenticated;
revoke truncate, references, trigger on table public.character_outfits from anon, authenticated;
revoke truncate, references, trigger on table public.character_combos from anon, authenticated;
revoke truncate, references, trigger on table public.character_snapshots from anon, authenticated;

commit;
