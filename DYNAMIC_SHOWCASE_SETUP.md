# 動的アクト紹介の導入

アクト紹介の正式な公開方式は、生成HTMLをGitHubへ配置する方式から、Supabaseへ紹介データを保存して閲覧時に生成する方式へ変更しています。

## 必須設定

SupabaseのSQL Editorで次を実行してください。

```text
supabase/20_dynamic_act_showcase.sql
```

このSQLは次を追加します。

- `acts.showcase_data`：公開用の構造化データ
- `acts.showcase_public`：公開状態
- `acts.showcase_updated_at`：紹介データ更新日時
- `publish_act_showcase_for_current_user`：所有者確認付き公開RPC
- `get_public_act_showcase`：公開中の紹介データだけを取得するRPC

## 公開URL

```text
act-showcase.html?id=<アクト識別名>
```

`act-showcase.html`は固定テンプレートです。参照時にSupabaseから紹介データを取得し、DOM APIで画面を生成します。ユーザーが入力したHTMLやJavaScriptを実行しません。

## HTML出力

生成画面の以下の機能は従来どおり利用できます。

- HTML生成・プレビュー
- HTMLダウンロード
- HTMLコピー

「アクト紹介を公開」では生成HTML自体を保存せず、生成結果から抽出した表示データだけをSupabaseへ保存します。

## 旧公開ページ

`showcases/*.html`に存在する過去の静的公開ページは自動削除しません。新規公開および再公開から動的ページを使用します。

旧`publish-showcase` Edge Functionは新しい公開ボタンから呼び出されません。既存の静的ページを維持する間は残しても問題ありません。
