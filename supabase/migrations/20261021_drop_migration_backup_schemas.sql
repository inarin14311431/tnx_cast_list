-- 20261021_drop_migration_backup_schemas.sql
--
-- 移行時のロールバック用に残していたバックアップを削除する。利用者の判断で削除を決定済み
-- (退会してもこれらのスキーマにユーザーのデータが残る問題の解消を兼ねる)。
--
-- 削除の理由:
--   - ロールバックの期間が終わり、どこからも参照されていない。
--   - 退会処理は public スキーマの行しか消さないため、バックアップ側にユーザー由来のデータが残り続ける。
--
-- 削除の対象(共有DB koprmbkoftuuffslhsvt、2026-10-21 に読み取りで確認した行数):
--   internal_archive.character_skills_backup_style_canonical_20260825   506行(索引 ..._id_idx を含む)
--   internal_archive.character_outfits_backup_ofc_conversion_20260818   300行
--   migration_backup_20260901.character_skills                          2,499行
--   migration_backup_20260901.character_snapshots                       13行
--   migration_backup_20260901.parse_legacy_style_detail(text)           関数
--   そのあと、空になった schema internal_archive と schema migration_backup_20260901 を削除する。
--   確認時、この2つのスキーマには上のオブジェクトしかなく、スキーマ外のビュー・外部キー・関数・トリガーからの
--   依存もなかった。
--
-- 削除は元に戻せない(ロールバック不可)。
--   drop したテーブルの中身は、この migration を適用したあと復元できない。バックアップ(pg_dump など)も
--   取っていない。戻すとしても、空の同名スキーマ・表・関数を新規 migration で作り直せるだけで、行は戻らない。
--   適用前に削除してよいことを必ず確認すること(実DBへの適用は明示的な確認を取ってから。AGENTS.md)。
--
-- 方針:
--   - drop schema ... cascade は使わない。表と関数を個別に drop する。
--   - スキーマの drop の前に、中身が空であることを数えて確かめ、空でなければ例外にして止める。
--     そのうえで drop schema は restrict(既定)で行う。
--   - public スキーマには触れない。
--   - 過去の migration(supabase/33_・34_)は編集しない。

-- ---------------------------------------------------------------------------
-- 1. 表と関数を個別に drop する
-- ---------------------------------------------------------------------------
drop table if exists internal_archive.character_skills_backup_style_canonical_20260825;
drop table if exists internal_archive.character_outfits_backup_ofc_conversion_20260818;
drop table if exists migration_backup_20260901.character_skills;
drop table if exists migration_backup_20260901.character_snapshots;
drop function if exists migration_backup_20260901.parse_legacy_style_detail(text);

-- ---------------------------------------------------------------------------
-- 2. 両スキーマが空であることを確かめてから、スキーマを drop する
-- ---------------------------------------------------------------------------
do $$
declare
  remaining text;
begin
  select string_agg(found.obj, ', ' order by found.obj) into remaining
  from (
    -- relkind は "char" 型。text || "char" は演算子が一意に決まらず 42725 で失敗するため ::text に変換する。
    select n.nspname || '.' || c.relname || ' (relkind ' || c.relkind::text || ')' as obj
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname in ('internal_archive', 'migration_backup_20260901')
    union all
    select n.nspname || '.' || p.proname || '() (function)'
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('internal_archive', 'migration_backup_20260901')
    union all
    select n.nspname || '.' || t.typname || ' (type)'
      from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
     where n.nspname in ('internal_archive', 'migration_backup_20260901')
       and t.typtype in ('e', 'd', 'r', 'm')
  ) found;

  if remaining is not null then
    raise exception 'internal_archive / migration_backup_20260901 are not empty, refusing to drop the schemas: %', remaining;
  end if;
end
$$;

drop schema if exists internal_archive restrict;
drop schema if exists migration_backup_20260901 restrict;
