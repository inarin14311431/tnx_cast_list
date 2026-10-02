-- Codify the character share-link objects that already exist in the shared
-- Supabase project but were not yet tracked in migration history. This file
-- reproduces the live definitions exactly (confirmed against the running
-- database before writing this migration) and does not change behavior.
--
-- Capability-URL design (unchanged):
--   * public    cast.html?id=<public_id>                 -> anonymous view via normal RLS
--   * unlisted  cast.html?id=<public_id>&share=<token>    -> anonymous view only via
--                                                            get_unlisted_character_bundle(token)
--   * private   never anonymously viewable
--
-- character_share_links is never SELECTable by anon; the only anonymous read
-- path is the SECURITY DEFINER RPC below, which returns data solely for
-- characters whose visibility is 'public' or 'unlisted' and whose share_token
-- matches exactly.

create table if not exists public.character_share_links (
  character_id uuid primary key references public.characters(id) on delete cascade,
  share_token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.character_share_links enable row level security;

drop policy if exists "Owners can read share links" on public.character_share_links;
create policy "Owners can read share links" on public.character_share_links
for select to authenticated
using (
  exists (
    select 1 from public.characters c
    where c.id = character_share_links.character_id
      and c.owner_id = (select auth.uid())
  )
);

-- The anon role gets nothing here, and authenticated gets read-only: rows are
-- created only by the trigger below (SECURITY DEFINER, runs as table owner).
revoke all on public.character_share_links from public, anon;
grant select on public.character_share_links to authenticated;

create or replace function internal_security.ensure_character_share_link()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
begin
  insert into public.character_share_links (character_id)
  values (new.id)
  on conflict (character_id) do nothing;
  return new;
end;
$$;

revoke all on function internal_security.ensure_character_share_link() from public, anon, authenticated;

drop trigger if exists trg_ensure_character_share_link on public.characters;
create trigger trg_ensure_character_share_link
after insert on public.characters
for each row execute function internal_security.ensure_character_share_link();

create or replace function public.get_unlisted_character_bundle(p_share_token uuid)
returns jsonb
language sql
stable security definer
set search_path = 'public', 'pg_temp'
as $$
  select jsonb_build_object(
    'character', to_jsonb(c),
    'skills', coalesce(
      (select jsonb_agg(to_jsonb(s) order by s.category, s.sort_order, s.name)
         from public.character_skills s
        where s.character_id = c.id),
      '[]'::jsonb
    ),
    'outfits', coalesce(
      (select jsonb_agg(to_jsonb(o) order by o.category, o.sort_order, o.name)
         from public.character_outfits o
        where o.character_id = c.id),
      '[]'::jsonb
    ),
    'combos', coalesce(
      (select jsonb_agg(to_jsonb(cb) order by cb.sort_order, cb.name, cb.created_at)
         from public.character_combos cb
        where cb.character_id = c.id),
      '[]'::jsonb
    ),
    'troops', coalesce(
      (select jsonb_agg(to_jsonb(t) order by t.name, t.created_at)
         from public.troops t
        where t.character_id = c.id),
      '[]'::jsonb
    )
  )
  from public.character_share_links sl
  join public.characters c on c.id = sl.character_id
  where sl.share_token = p_share_token
    and c.visibility in ('public', 'unlisted')
  limit 1;
$$;

revoke all on function public.get_unlisted_character_bundle(uuid) from public;
grant execute on function public.get_unlisted_character_bundle(uuid) to anon, authenticated;
