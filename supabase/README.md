# Supabase DB履歴と現行仕様

番号付きSQLは過去の変更履歴であり、現在のDBをゼロから構築する完全なスキーマではありません。適用済みかどうかを番号の存在だけで判断しないでください。

- 履歴の順序: `migrations-manifest.json`（05〜41、45ファイル）。過去の重複番号も保持します。
- 変更規則: `../docs/DATABASE_MIGRATIONS.md`。
- 2026-09-06の実DB照合・互換RPCの扱い: `../docs/DB_RECONCILIATION_20260906.md`。
- 実DBの検証: `../scripts/database-invariants.sql` は読取り専用で8条件を検査します。`npm run check:db:live` は管理APIの `SUPABASE_ACCESS_TOKEN` が必要です。通常の `verify` はローカルファイルのみの検査で、実DB適用を証明しません。

## 維持する仕様

画像バケットはアクト紹介の第三者共有に利用するため公開です。1 MiB・JPEG/PNG/WebPの制限は維持します。本番と検証は容量制約から同じDBを使用します。

テスト対象は `inarin1431@gmail.com`（所有者UIDはE2Eポリシーに固定）の管理キャストのみです。テスト時に所有者を照合し、確認できない書込みは停止します。

## 互換RPC

`public.can_use_master_search()` は本番の旧クライアントが使用中です。36番SQLの削除指示とは異なり、互換ラッパーとして現存しています。ログイン済み呼出しは維持し、匿名実行を禁止します。新クライアントは `has_privileged_editor_tools()` を使用します。全クライアントの移行完了前に互換関数を削除しないでください。

マスタRLSは `internal_security.can_use_master_search()` を使用します。管理テーブルのRLSポリシーを一般利用者向けに追加しないでください。
