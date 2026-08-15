-- コンボの使用スートを複数選択できるようにする。
-- 既存の単一値 (reason / passion / life / mundane / 空欄) との互換性を維持する。
-- フロント側は複数選択時に ability へ "reason,life" のようなカンマ区切りで保存する。

begin;

-- ability が enum 等で定義されていても複数値を保持できるよう text へ統一する。
alter table public.character_combos
  alter column ability drop default;

alter table public.character_combos
  alter column ability type text using ability::text;

alter table public.character_combos
  alter column ability set default '';

-- ability を単一スートに限定している既存 CHECK 制約があれば、制約名に依存せず削除する。
do $$
declare
  constraint_row record;
begin
  for constraint_row in
    select conname
    from pg_constraint
    where conrelid = 'public.character_combos'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%ability%'
  loop
    execute format(
      'alter table public.character_combos drop constraint %I',
      constraint_row.conname
    );
  end loop;
end
$$;

-- 空欄、単一スート、重複なしの複数スートを許可する。
-- 例: '' / 'reason' / 'reason,life' / 'reason,passion,life,mundane'
alter table public.character_combos
  add constraint character_combos_ability_valid
  check (
    coalesce(ability, '') = ''
    or ability ~ '^(reason|passion|life|mundane)(,(reason|passion|life|mundane))*$'
  );

notify pgrst, 'reload schema';

commit;
