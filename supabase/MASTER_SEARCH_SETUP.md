# SKD / OFC検索マスタ設定

編集画面の`SKD検索`・`OFC検索`は、Supabase Authでログイン済みのユーザーだけが利用できます。匿名ユーザーにはマスタテーブルのSELECT権限を付与しません。

## 1. SQL適用

Supabase SQL Editorで次を1回実行します。

```text
supabase/20_authenticated_master_search.sql
```

このSQLは次を追加します。

- `public.skd_master`
- `public.ofc_master`
- 検索用インデックス
- authenticated専用SELECTポリシー
- service_role専用更新権限

## 2. 管理者設定

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

## 3. Edge Functionデプロイ

```bash
supabase functions deploy sync-master-data
```

## 4. 初回同期

1. 管理者としてアカウント画面を開く
2. `SKD・OFC検索マスタ`パネルを確認する
3. 同期時だけ、元スプレッドシートを「リンクを知っている全員・閲覧者」にする
4. `マスタ同期`を押す
5. SKD・OFCの登録件数が表示されたことを確認する
6. 必要であればスプレッドシートの共有を再び制限する

元スプレッドシートを非公開のまま同期するには、Googleサービスアカウント等を使う別実装が必要です。現在のEdge FunctionはGoogle SheetsのCSVエクスポートを使用します。

## 5. 利用方法

編集画面に次のボタンが追加されます。

- `スタイル技能を追加` / `SKD TSV取込` / `SKD検索`
- `OFC TSV取込` / `OFC検索`

検索結果は複数選択でき、次の2方式を利用できます。

- `選択を直接追加`：編集画面へ技能・アウトフィットを追加し、通常の自動保存へ連動
- `選択をTSVコピー`：従来のTSV取込で利用できる形式をクリップボードへコピー

直接追加では、SKDのタイミング・対象・射程・目標値・対決・解説・参照ページをスタイル技能詳細へ反映します。OFCは編集画面が保持できる項目を各欄へ反映し、未対応の詳細値は解説欄へ追記します。
