# publish-showcase

セッション紹介ジェネレーターが生成したHTMLを、GitHub Pages用の`showcases/`ディレクトリへ公開するSupabase Edge Functionです。

## 必須Secret

- `GITHUB_SHOWCASE_TOKEN`

Fine-grained Personal Access Tokenは、`inarin14311431/tnx_cast_list`だけを対象にし、Repository permissionsの`Contents: Read and write`のみを付与します。

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

## サーバー側の制限

- SupabaseのログインJWTを検証
- 保存先を`showcases/<slug>.html`へ固定
- slugを半角小文字英数字とハイフン、最大64文字に制限
- 完全なHTML文書だけを許可
- HTMLを2MB以下に制限
- 許可Origin以外からのブラウザー呼び出しを拒否
- 同名ファイルはGitHubのblob SHAを取得して上書き
