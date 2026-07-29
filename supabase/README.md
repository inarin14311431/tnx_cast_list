# Supabase SQL 管理

このディレクトリの番号付きSQLは、運用中のSupabaseへ適用した履歴です。

現在置かれている番号付きSQLはすべて適用済みです。既存環境へ再実行する必要はありません。
新しい環境をゼロから構築する用途ではなく、変更内容の監査・復旧確認用として保持します。

## 適用済みSQL

| 番号 | ファイル | 役割 | 状態 |
|---:|---|---|---|
| 05 | `05_sheet_editor_migration.sql` | 統合キャラクターシート用の列追加 | 適用済み |
| 07 | `07_act_history.sql` | アクト履歴・参加キャストの基礎テーブル | 適用済み |
| 09 | `09_experience_spending.sql` | 経験点使用履歴 | 適用済み |
| 10 | `10_transactional_character_save.sql` | キャスト・技能・装備の一括保存RPC | 適用済み |
| 11 | `11_showcase_publish_security.sql` | アクト紹介公開時の所有者保護 | 適用済み |
| 12 | `12_showcase_history_only.sql` | 公開せず履歴だけ登録するRPC | 適用済み |
| 13 | `13_private_act_history.sql` | 自分の非公開キャストを履歴へ登録 | 適用済み |
| 14 | `14_visibility_two_state.sql` | 公開状態を`public`・`private`へ統一 | 適用済み |
| 15 | `15_owner_scoped_act_history.sql` | 履歴・経験点操作をキャスト所有者へ限定 | 適用済み |
| 16 | `16_style_separator_none.sql` | スタイル技能区切りの種別を`none`へ統一 | 適用済み |
| 18 | `18_delete_owned_act_history.sql` | 所有キャストの履歴削除RPC | 適用済み |
| 19 | `19_act_participation_role.sql` | アクト参加枠の保存 | 適用済み |
| 20 | `20_dynamic_act_showcase.sql` | アクト紹介データの保存・動的表示 | 適用済み |
| 21 | `21_master_search_uid_allowlist.sql` | SKD/OFCマスタ検索のUID許可リスト | 適用済み |
| 22 | `22_outfit_ofc_details.sql` | OFC固有項目と保存RPC | 適用済み |

## 欠番について

欠番は、重複・旧仕様・採番誤りの整理によって削除された番号です。

- `01`〜`04`：初期構築時の旧ファイル。現在の運用用SQL一覧には含めない
- `06`：`handle_kana`追加のみの重複SQL。`05_sheet_editor_migration.sql`に包含されるため削除
- `08`：経験点使用履歴SQLの旧番号。`09_experience_spending.sql`へ改番済み
- `17`：アクト履歴削除SQLの旧番号。`18_delete_owned_act_history.sql`へ改番済み

適用済み履歴の意味を変えないため、残存ファイルを無理に連番へ改名しません。

## 今後の採番規則

次のDB変更は`23_機能名.sql`から追加します。

- 一つの番号は一つの変更目的に限定する
- 適用済みファイルの内容・番号は原則変更しない
- 修正が必要な場合は既存SQLを上書きせず、新しい番号のSQLを追加する
- 重複ファイルや説明だけのSQLは追加しない
- SQLは可能な限り再実行可能な形にする
- ファイル冒頭へ目的と依存する直前番号をコメントする
- 適用後はこの一覧へ状態を追記する

## Edge Functions

`functions/`配下はSQLの採番対象外です。Edge Functionを変更した場合は、対象関数をSupabaseへ再デプロイしてください。
