# Playwright E2E

このディレクトリは、ローカルとGitHub Actionsで同じPlaywrightテストを実行するための一式です。

## 初回セットアップ（Windows / PowerShell）

```powershell
git pull
npm.cmd install
npx.cmd playwright install chromium
```

PowerShellのExecution Policyで `npm.ps1` / `npx.ps1` が拒否される環境では、必ず `npm.cmd` / `npx.cmd` を使用します。

## 認証が必要なテスト

認証情報はコードへ保存しません。PowerShellセッションへ環境変数として設定します。

```powershell
$env:E2E_EMAIL="テスト用メールアドレス"
$env:E2E_PASSWORD="テスト用パスワード"
$env:E2E_CAST_ID="TNX-000091"
$env:E2E_TROOP_ID="TRP-56F796299BEC"
```

`E2E_EMAIL` / `E2E_PASSWORD` が未設定の場合、認証必須テストは失敗ではなくskipになります。`E2E_CAST_ID` は未設定時に `TNX-000091` を使用します。
`E2E_TROOP_ID` は公開閲覧テスト用で、未設定時は `TRP-56F796299BEC` を使用します。

旧ローカル環境との互換用に `TEST_EMAIL` / `TEST_PASSWORD` / `TEST_CAST_ID` も利用できます。

## 実行

全体:

```powershell
npx.cmd playwright test
```

Chromiumのみ:

```powershell
npx.cmd playwright test --project=chromium
```

モバイルのみ:

```powershell
npx.cmd playwright test --project=mobile
```

ブラウザを表示:

```powershell
npx.cmd playwright test --headed
```

特定テスト:

```powershell
npx.cmd playwright test tests/e2e/editor-help.spec.js --project=mobile --headed
```

トループ関連のみ:

```powershell
npm.cmd run test:troop
npm.cmd run e2e:troop
```

HTMLレポート:

```powershell
npx.cmd playwright show-report
```

## テスト方針

- OS差が出やすいページ全体の画像比較を主判定にしない。
- レイアウトはDOMの寸法、grid列数、横スクロール有無で検査する。
- 認証情報は実行時に生成した `playwright/.auth/user.json` のみへ保存する。
- `playwright/.auth/`, `test-results/`, `playwright-report/` はGit管理しない。
- index/accountの◎・●は10px固定のCSS図形であることを検査する。
- iPhone幅のaccountカードはdesktop用flex-basisが残っていないことを検査する。
- 編集画面は右上HELPボタンとダイアログの表示を検査する。
- トループ編集はテスト内のSupabase応答へ隔離したデータを作成し、認証Secretsの有無にかかわらず再読込・更新・閲覧・削除のCRUDフローを毎回検査する。

## GitHub Actions

`.github/workflows/playwright.yml` が `main` push、Pull Request、手動実行で動きます。

認証必須テストもCIで実行する場合、Repository Settings > Secrets and variables > Actions に以下を登録します。

- `E2E_EMAIL`
- `E2E_PASSWORD`
- `E2E_CAST_ID`
- `E2E_TROOP_ID`

Secretsが未登録でも公開画面のテストは実行され、認証必須テストはskipされます。
