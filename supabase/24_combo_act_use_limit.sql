-- コンボへ「1アクト中に使用できる回数」の上限を追加する。
-- 採番上の直前: 23_remove_legacy_github_pages_publish.sql（機能依存なし）

begin;

alter table public.character_combos
  add column if not exists act_use_limit integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'character_combos_act_use_limit_positive'
      and conrelid = 'public.character_combos'::regclass
  ) then
    alter table public.character_combos
      add constraint character_combos_act_use_limit_positive
      check (act_use_limit is null or act_use_limit > 0);
  end if;
end
$$;

comment on column public.character_combos.act_use_limit is
  '1アクト中の使用上限。NULLは回数トラッカーを使用しない。';

notify pgrst, 'reload schema';

commit;
