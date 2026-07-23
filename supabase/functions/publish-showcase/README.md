# publish-showcase / act publisher

アクト紹介ジェネレーターが生成したHTMLをGitHub Pages用の`showcases/`ディレクトリへ公開し、選択キャストを参加アクト履歴へ登録するSupabase Edge Functionです。

## 事前準備

Supabase SQL Editorで次を実行します。

```text
supabase/07_act_history.sql
```

これにより、`acts`、`act_participants`、`record_act_publication`が作成されます。

## 必須Secret

- `GITHUB_SHOWCASE_TOKEN`

Fine-grained Personal Access Tokenは、`inarin14311431/tnx_cast_list`だけを対象にし、Repository permissionsの`Contents: Read and write`のみを付与します。

`SUPABASE_URL`と`SUPABASE_SERVICE_ROLE_KEY`はSupabase Edge Functionsの標準環境変数を利用します。

## デプロイ

```bash
supabase functions deploy publish-showcase --project-ref koprmbkoftuuffslhsvt
```

DashboardのEdge Functionsエディターを使う場合は、関数名を`publish-showcase`として`index.ts`の内容を登録し、JWT検証を有効にした状態でデプロイします。

## 任意の制限用Secret

どちらも未設定の場合は、Supabaseへログイン済みのオペレーター全員が公開できます。

- `SHOWCASE_ADMIN_USER_IDS`: 公開を許可するSupabase Auth User ID。複数の場合はカンマ区切り。
- `SHOWCASE_ADMIN_EMAILS`: 公開を許可するメールアドレス。複数の場合はカンマ区切り。
- `SHOWCASE_ALLOWED_ORIGINS`: 呼び出しを許可するOrigin。未設定時は`https://inarin14311431.github.io`。
- `GITHUB_SHOWCASE_REPOSITORY`: 未設定時は`inarin14311431/tnx_cast_list`。
- `GITHUB_SHOWCASE_BRANCH`: 未設定時は`main`。
- `GITHUB_SHOWCASE_PAGES_BASE`: 未設定時は`https://inarin14311431.github.io/tnx_cast_list`。

## サーバー側の処理

- SupabaseのログインJWTを検証
- 管理者設定がある場合は公開権限を検証
- 保存先を`showcases/<slug>.html`へ固定
- アクト名、slug、HTML、参加キャスト1～6名を検証
- 選択キャストが公開状態であることを確認
- GitHub Pages用HTMLを新規作成または上書き
- `acts`へアクト情報を登録
- `act_participants`へ参加キャストと出演順を登録
- 再公開時も既存の獲得経験点を保持
