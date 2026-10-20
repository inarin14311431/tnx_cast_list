-- 20261020_unlisted_bundle_troops_public_and_rls_initplan.sql
--
-- 1. get_unlisted_character_bundle: 'troops' に t.visibility = 'public' を追加する。
--    非公開の部隊が限定公開リンク経由で漏れないようにする。language / stable /
--    security definer / search_path / GRANT は 20260930_character_share_links.sql から変えない。
-- 2. Supabase advisor auth_rls_initplan (35件) の解消。public スキーマのRLSポリシーの
--    auth.uid() を (select auth.uid()) に置き換える。DROPせず ALTER POLICY で USING /
--    WITH CHECK だけを書き換える。条件の意味・対象ロール・コマンドは変えない
--    (ALTER POLICY ... TO は指定しない)。character_share_links は適用済みのため対象外。
--
-- 実DBへの適用は明示的な確認を取ってから行うこと (AGENTS.md)。
--
-- ロールバック手順:
--   (2) このファイルの ALTER POLICY 文を、`(select auth.uid())` を `auth.uid()` に
--       戻した形で実行する(意味は同一。DROP/再作成は不要)。例:
--         alter policy "troops_select_visible" on public.troops
--           using (visibility = 'public' or owner_id = auth.uid());
--       元の式は適用前に pg_policies から取得しておくこと:
--         select tablename, policyname, qual, with_check from pg_policies
--          where schemaname = 'public' order by 1, 2;
--   (1) get_unlisted_character_bundle を 20260930_character_share_links.sql の定義で
--       `create or replace function` し直す(troops 句の `and t.visibility = 'public'` を除く)。
--       GRANT は変わらないため再実行不要。
--   migration自体は削除・編集しない。戻す場合は新規migrationとして追加する。

-- ---------------------------------------------------------------------------
-- 1. get_unlisted_character_bundle
-- ---------------------------------------------------------------------------
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
        where t.character_id = c.id
          and t.visibility = 'public'),
      '[]'::jsonb
    )
  )
  from public.character_share_links sl
  join public.characters c on c.id = sl.character_id
  where sl.share_token = p_share_token
    and c.visibility in ('public', 'unlisted')
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- 2. auth_rls_initplan
-- ---------------------------------------------------------------------------

-- characters (4)
alter policy "Authenticated users can create characters" on public.characters
  with check (owner_id = (select auth.uid()));
alter policy "Owners can delete characters" on public.characters
  using (owner_id = (select auth.uid()));
alter policy "Owners can update characters" on public.characters
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
alter policy "Public characters are readable" on public.characters
  using (visibility = 'public' or owner_id = (select auth.uid()));

-- character_skills (4)
alter policy "Owners can create skills" on public.character_skills
  with check (exists (select 1 from public.characters c
    where c.id = character_skills.character_id and c.owner_id = (select auth.uid())));
alter policy "Owners can delete skills" on public.character_skills
  using (exists (select 1 from public.characters c
    where c.id = character_skills.character_id and c.owner_id = (select auth.uid())));
alter policy "Owners can update skills" on public.character_skills
  using (exists (select 1 from public.characters c
    where c.id = character_skills.character_id and c.owner_id = (select auth.uid())));
alter policy "Readable skills of visible characters" on public.character_skills
  using (exists (select 1 from public.characters c
    where c.id = character_skills.character_id
      and (c.visibility = 'public' or c.owner_id = (select auth.uid()))));

-- character_outfits (4)
alter policy "Owners can create outfits" on public.character_outfits
  with check (exists (select 1 from public.characters c
    where c.id = character_outfits.character_id and c.owner_id = (select auth.uid())));
alter policy "Owners can delete outfits" on public.character_outfits
  using (exists (select 1 from public.characters c
    where c.id = character_outfits.character_id and c.owner_id = (select auth.uid())));
alter policy "Owners can update outfits" on public.character_outfits
  using (exists (select 1 from public.characters c
    where c.id = character_outfits.character_id and c.owner_id = (select auth.uid())));
alter policy "Readable outfits of visible characters" on public.character_outfits
  using (exists (select 1 from public.characters c
    where c.id = character_outfits.character_id
      and (c.visibility = 'public' or c.owner_id = (select auth.uid()))));

-- character_combos (4)
alter policy "Owners can create combos" on public.character_combos
  with check (exists (select 1 from public.characters c
    where c.id = character_combos.character_id and c.owner_id = (select auth.uid())));
alter policy "Owners can delete combos" on public.character_combos
  using (exists (select 1 from public.characters c
    where c.id = character_combos.character_id and c.owner_id = (select auth.uid())));
alter policy "Owners can update combos" on public.character_combos
  using (exists (select 1 from public.characters c
    where c.id = character_combos.character_id and c.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.characters c
    where c.id = character_combos.character_id and c.owner_id = (select auth.uid())));
alter policy "Readable combos of visible characters" on public.character_combos
  using (exists (select 1 from public.characters c
    where c.id = character_combos.character_id
      and (c.visibility = 'public' or c.owner_id = (select auth.uid()))));

-- character_experience_spending (4)
alter policy "experience_spending_delete_owner" on public.character_experience_spending
  using (exists (select 1 from public.characters c
    where c.id = character_experience_spending.character_id and c.owner_id = (select auth.uid())));
alter policy "experience_spending_insert_owner" on public.character_experience_spending
  with check (created_by = (select auth.uid()) and exists (select 1 from public.characters c
    where c.id = character_experience_spending.character_id and c.owner_id = (select auth.uid())));
alter policy "experience_spending_select_owner" on public.character_experience_spending
  using (exists (select 1 from public.characters c
    where c.id = character_experience_spending.character_id and c.owner_id = (select auth.uid())));
alter policy "experience_spending_update_owner" on public.character_experience_spending
  using (exists (select 1 from public.characters c
    where c.id = character_experience_spending.character_id and c.owner_id = (select auth.uid())))
  with check (created_by = (select auth.uid()) and exists (select 1 from public.characters c
    where c.id = character_experience_spending.character_id and c.owner_id = (select auth.uid())));

-- character_snapshots (3)
alter policy "character_snapshots_delete_own" on public.character_snapshots
  using (owner_id = (select auth.uid()));
alter policy "character_snapshots_insert_own" on public.character_snapshots
  with check (owner_id = (select auth.uid()));
alter policy "character_snapshots_select_own" on public.character_snapshots
  using (owner_id = (select auth.uid()));

-- troops (4)
alter policy "troops_delete_own" on public.troops
  using (owner_id = (select auth.uid()));
alter policy "troops_insert_own" on public.troops
  with check (owner_id = (select auth.uid()));
alter policy "troops_select_visible" on public.troops
  using (visibility = 'public' or owner_id = (select auth.uid()));
alter policy "troops_update_own" on public.troops
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- act_participants (3)
alter policy "act_participants_delete_owner" on public.act_participants
  using (exists (select 1 from public.characters c
    where c.id = act_participants.character_id and c.owner_id = (select auth.uid())));
alter policy "act_participants_select_owner" on public.act_participants
  using (exists (select 1 from public.characters c
    where c.id = act_participants.character_id and c.owner_id = (select auth.uid())));
alter policy "act_participants_update_owner" on public.act_participants
  using (exists (select 1 from public.characters c
    where c.id = act_participants.character_id and c.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.characters c
    where c.id = act_participants.character_id and c.owner_id = (select auth.uid())));

-- acts (1)
alter policy "acts_select_owner_scope" on public.acts
  using (
    published_by = (select auth.uid())
    or exists (select 1
      from public.act_participants ap
      join public.characters c on c.id = ap.character_id
      where ap.act_id = acts.id and c.owner_id = (select auth.uid()))
  );

-- act_showcase_guests (4)
alter policy "showcase_guest_owner_delete" on public.act_showcase_guests
  using (owner_id = (select auth.uid()));
alter policy "showcase_guest_owner_insert" on public.act_showcase_guests
  with check (owner_id = (select auth.uid()));
alter policy "showcase_guest_owner_select" on public.act_showcase_guests
  using (owner_id = (select auth.uid()));
alter policy "showcase_guest_owner_update" on public.act_showcase_guests
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
