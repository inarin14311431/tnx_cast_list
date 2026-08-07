# SKD / OFC検索マスタ設定

編集画面の`SKD検索`・`OFC検索`は、Supabase Authへログインしたうえで、`public.master_search_users`へUIDを明示登録されたユーザーだけが利用できます。単にアカウントを作成しただけのユーザーや、同期管理者として登録されていないユーザーにはマスタデータを返しません。

## 1. SQL適用

新規構築の場合は、Supabase SQL Editorで次を実行します。

```text
supabase/20_authenticated_master_search.sql
```

旧版の`20_authenticated_master_search.sql`をすでに実行している環境では、追加で次を1回実行してください。

```text
supabase/21_master_search_uid_allowlist.sql
```

このSQLは次を追加・更新します。

- `public.skd_master`
- `public.ofc_master`
- `public.master_search_users`（検索許可UIDリスト）
- `public.can_use_master_search()`（現在UIDの許可確認）
- 検索用インデックス
- 許可UID専用SELECTポリシー
- service_role専用更新権限

## 2. 検索を許可するUIDの登録

検索を許可するユーザーごとに、Supabase SQL Editorで登録します。

```sql
insert into public.master_search_users (user_id, memo)
values ('<検索を許可するSupabase Auth UID>', 'SKD/OFC検索利用者')
on conflict (user_id) do update
set memo = excluded.memo;
```

管理者のアカウント画面にある`SKD・OFC検索マスタ`パネルでは、Supabase Authの登録メールアドレスを候補から選択し、上記の登録SQLをクリップボードへコピーできます。SQLの実行自体はSupabase SQL Editorで手動実行します。

登録状況の確認：

```sql
select user_id, memo, created_at
from public.master_search_users
order by created_at;
```

利用許可を取り消す場合：

```sql
delete from public.master_search_users
where user_id = '<利用を停止するUID>';
```

`MASTER_DATA_ADMIN_USER_IDS`は同期操作の管理者設定です。ここへ登録しただけでは検索許可リストへ自動登録されません。同期管理者自身も検索する場合は、そのUIDを`public.master_search_users`へ登録してください。

## 3. 同期管理者設定

アカウント画面に同期パネルを表示する管理者をEdge FunctionのSecretsへ登録します。ユーザーIDかメールアドレスのどちらか一方で構いません。

```bash
supabase secrets set \
  MASTER_DATA_ADMIN_USER_IDS="<Supabase AuthのユーザーID>" \
  MASTER_DATA_ALLOWED_ORIGINS="https://inarin14311431.github.io"
```

メールアドレスを使う場合：

```bash
supabase secrets set \
  MASTER_DATA_ADMIN_EMAILS="<管理者メールアドレス>"
```

複数指定はカンマ区切りです。

スプレッドシートIDとgidはEdge Function内に既定値があります。変更する場合だけ次を設定します。

```bash
supabase secrets set \
  MASTER_SKD_SPREADSHEET_ID="1XSSgipkhFU0nukt4Hy7rk3AC1MJ0XhzdSe-J873Uivo" \
  MASTER_SKD_GID="1787190988" \
  MASTER_OFC_SPREADSHEET_ID="1gIjy8ze7954YLL3SOxGhRr9Lec-cXv1LgHIvlRjjjSg" \
  MASTER_OFC_GID="0"
```

## 4. Edge Functionデプロイ

マスタ同期用と、管理者向け登録メール一覧取得用の2つをデプロイします。

```bash
supabase functions deploy sync-master-data
supabase functions deploy master-auth-users
```

`master-auth-users`は管理者だけが呼び出せます。返す情報は登録者のメールアドレス、UID、登録日時、最終ログイン日時だけで、パスワードや認証トークンは返しません。

## 5. 初回同期

1. 管理者としてアカウント画面を開く
2. `SKD・OFC検索マスタ`パネルを確認する
3. 同期時だけ、元スプレッドシートを「リンクを知っている全員・閲覧者」にする
4. `マスタ同期`を押す
5. SKD・OFCの登録件数が表示されたことを確認する
6. 必要であればスプレッドシートの共有を再び制限する

元スプレッドシートを非公開のまま同期するには、Googleサービスアカウント等を使う別実装が必要です。現在のEdge FunctionはGoogle SheetsのCSVエクスポートを使用します。

## 6. 利用方法

許可UIDで編集画面を開いた場合だけ、次のボタンが表示されます。

- `スタイル技能を追加` / `SKD TSV取込` / `SKD検索`
- `OFC TSV取込` / `OFC検索`

未登録UIDでは検索ボタンを表示せず、開発者ツール等から直接マスタテーブルへアクセスしてもRLSにより0件となります。

検索結果は複数選択でき、次の2方式を利用できます。

- `選択を直接追加`：編集画面へ技能・アウトフィットを追加し、保存ボタンでDBへ保存
- `選択をTSVコピー`：従来のTSV取込で利用できる形式をクリップボードへコピー

直接追加では、SKDのタイミング・対象・射程・目標値・対決・解説・参照ページをスタイル技能詳細へ反映します。OFCは編集画面が保持できる項目を各欄へ反映し、未対応の詳細値は解説欄へ追記します。
