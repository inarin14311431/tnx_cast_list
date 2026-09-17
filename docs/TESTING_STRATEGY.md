# テスト方針 / Testing Strategy

最終更新: 2026-09-17

この文書は、変更内容に対して「どの種類のテストを、どこまで実施するか」を判断するための基準である。

## 1. 基本原則

- 同じ仕様を複数レイヤーで重複確認しない。
- pure logicはNode testへ寄せる。
- 構造・ownership・禁止事項はaudit scriptで検査する。
- 実ブラウザ操作はPlaywrightで確認する。
- 見た目はVisual Regressionへ寄せる。
- accessibility/performanceはQuality workflowで扱う。
- live DBへの書込みは通常CIから分離する方針とする。2026-09-17時点で本番側は分離未完了のため、第6節の現状を確認する。
- テスト失敗を消すために契約を弱めない。

## 2. 品質契約

`quality-gates.json` が必須scriptとworkflowのsource of truthである。

必須scriptには少なくとも以下が含まれる。

- `check:js`
- `audit:modules`
- `audit:integrity`
- `audit:sheet`
- `audit:cast`
- `audit:troop`
- `audit:mobile`
- `audit:css`
- `audit:themes`
- `audit:security`
- `audit:migrations`
- `audit:quality`
- `test`
- `test:visual`
- `test:quality`

必須workflow:

- `playwright.yml`
- `regression.yml`
- `security.yml`
- `visual-regression.yml`
- `quality.yml`

この契約を変更する場合は、検証repoと本番repoのparityを維持する。

## 3. 通常の基準コマンド

実装変更後の基本確認:

```bash
npm run verify
```

`verify` はJavaScript構文、cache policy、module graph、runtime integrity、CSS/Theme、主要画面runtime、Security、Migration、Quality契約、CI契約、ownership report、Node regression testをまとめて実行する。検証repoでは、これにE2E分類契約の `audit:e2e` が含まれる。本番repoにはこの追加監査は未導入である。

「対象コードが少ないから `npm test` だけ」で終了しない。最終的には `verify` を通す。

## 4. Static audit

static auditは、ブラウザを起動せずに構造的な契約を検査する。

代表例:

- `check:js` — JS syntax
- `audit:modules` — import target / retired runtime / dependency graph
- `audit:integrity` — runtime integrity
- `audit:css` — CSS ownership / duplicate / prohibited patterns
- `audit:themes` — theme registry / manifest / scope
- `audit:sheet` — PC editor runtime contract
- `audit:mobile` — Mobile editor runtime contract
- `audit:cast` — cast viewer runtime
- `audit:troop` — troop runtime
- `audit:security` — security invariant
- `audit:migrations` — migration history contract
- `audit:e2e` — E2E manifest分類（検証repoのみ導入済み）
- `audit:ci` — CI coverage contract

構造変更では、まずauditで検出可能なinvariantを追加することを検討する。

## 5. Node regression tests

`npm test` は `tests/*.test.mjs` を実行する。

Node testに向く対象:

- pure function
- data normalizer
- save/load projection
- 初期値生成
- compare logic
- ownership contract
- source文字列/構造契約
- 過去不具合の再発防止

DOM実ブラウザの挙動を文字列testだけで代用しない。一方、pure logicをPlaywrightだけで確認しない。

## 6. Playwright E2E分類

以下の分類は検証repoで導入済み。正規分類は `tests/e2e/test-suites.json` がsource of truthであり、検証repoに新しい `.spec.js` を追加する場合は必ず分類する。

### 環境差（2026-09-17確認）

| 項目 | 検証repo | 本番repo |
|---|---|---|
| `e2e:ci-public` / `e2e:ci-editor` / `e2e:ci-mobile` | npm scriptsとして導入済み | 未導入 |
| `e2e:manual-ui` / `e2e:live-write` | npm scriptsとして導入済み | 未導入 |
| `audit:e2e` | `verify` / Regression checksに組込み済み | script・監査とも未導入 |
| suite runner | `scripts/run-e2e-suite.mjs` がmanifestを読む | runner未導入、workflowがspecを直接列挙 |
| `tests/e2e/test-suites.json` | 現行の実行分類として利用 | ファイルはあるが、一部の参照specとrunnerが未同期。現在のCI実行対象とは一致しない |
| 保存・原状復帰テスト | `audit-editor-live.spec.js` を `live-write` に分離 | `audit-coverage.spec.js` が既存CIの実行対象に含まれる |

本番で検証専用コマンドを実行したり、manifestの存在だけでlive-writeが分離済みだと判断したりしないこと。現在の実行対象は、対象repoの `package.json` と `.github/workflows/playwright.yml` で確認する。

本番の `audit-coverage.spec.js` にはPC/Mobileの保存・再読込・原状復帰テストがある。認証条件を満たすと既存CIでも実DBへの書込みが発生し得るため、第7節の対象制限・復元・別repoとの同時書込み回避の条件を適用する。全specを対象にする `npx playwright test` も通常確認の代替として無条件には実行しない。

今回の引き継ぎ資料整備は文書のみを対象とし、テスト構成・workflowの同期は含めない。テスト構成を同期する際は別の変更として差分と共有DBへの影響を確認する。以下の各グループ説明は検証repoの現行構成を示す。

### `ci-public`

- 公開画面
- smoke test
- 意図的な実DB書込みなし
- 通常PR CI対象

### `ci-editor`

- 認証済み編集画面
- SKD master search等を含む
- 意図的なlive-writeなし
- 通常PR CI対象

### `ci-mobile`

- Mobile editor / Mobile表示回帰
- 通常PR CI対象

### `manual-ui`

- 過去の特定UI不具合
- 細かいレイアウト/操作確認
- 関連変更時に限定実行

### `live-write`

- 実DBへの保存/復元
- 通常PR CIから分離
- 明示的に必要な場合だけ実行

詳細な実行方法は `tests/e2e/README.md` を参照する。

## 7. live-write安全ルール

live-writeは最も危険なテスト層である。

必須条件:

1. 承認済みテスト所有者のキャストだけを使用する。
2. ownershipを確認してからmutationする。
3. unscoped mutationをしない。
4. 実行前に回復可能なsnapshotを確保する。
5. テストは `finally` で元の値へ戻す。
6. 実行中のwrite testを強制cancelしない。
7. 復元時に別の新しいユーザー変更を上書きしない。
8. 別repoのwrite testと同時に走らせない。

認証必須runで認証情報不足をskip成功に見せたくない場合は `E2E_REQUIRE_AUTH=1` を使う。

秘密情報はGit、文書、issue、PRへ保存しない。

## 8. Visual Regression

Visual Regressionは外観契約を確認する。

向く対象:

- テーマ
- レイアウト
- showcase演出
- card/tableの見た目
- PC/Mobileの主要表示

通常E2Eの主判定をページ全体スクリーンショットだけにしない。OS/font差が出やすい箇所はDOM寸法や状態を併用する。

Visual baseline更新は「差分を消すため」ではなく、新デザインが意図したものだと確認した後に行う。

## 9. Quality tests

`quality.yml` は主に以下を扱う。

- Accessibility baseline
- Performance budget
- verification contract parity

ARIA属性を機械的に追加するのではなく、実際のaccessibility問題、keyboard操作、focus、dialog behaviorを確認する。

## 10. Security tests

`scripts/audit-security.mjs` はsecurity設計の回帰防止契約である。

代表的なinvariant:

- browser clientにservice-roleを含めない
- login return URLのsame-origin制約
- backup restoreのsize/count制限
- restored cast ownership / visibilityの強制
- account delete server-side auth/password validation
- administrator identityをhard-codeしない
- act publication RPCのownership guard
- owner-scoped act reads
- privileged editor gate
- image upload limit / MIME制約
- internal archive/security schemaの非公開化
- least privilege grants

Security変更時はauditを削るのではなく、新しい設計を表すinvariantへ更新する。

## 11. DB変更時の追加確認

DB変更では `npm run verify` だけでは不十分。

追加で確認するもの:

- 新規migrationがmanifestへ追加されている
- 過去migrationを編集していない
- live deployment state
- `scripts/database-invariants.sql`
- RLS / grant / RPC ownership
- compatibility path
- 本番クライアントが旧形式をまだ必要としていないか

## 12. 変更種別ごとの最低テスト

表中の `ci-public` / `ci-editor` / `ci-mobile` は検証repoの分類を指す。本番の確認では第6節の環境差を踏まえ、現行workflowの対象specと書込みの有無を確認する。

| 変更 | 最低限 |
|---|---|
| pure shared logic | Node test + `npm run verify` |
| PC editor JS | Node/static audit + `ci-editor` + `verify` |
| Mobile editor JS | Node/static audit + `ci-mobile` + `verify` |
| PC/Mobile共通core | Node同値/contract test + `ci-editor` + `ci-mobile` + `verify` |
| Public viewer | `ci-public` + `audit:cast` + `verify` |
| CSS/layout | `audit:css` + relevant E2E + Visual + `verify` |
| Theme | `audit:themes` + Visual + `verify` |
| Accessibility | Quality + keyboard/focus確認 + `verify` |
| Snapshot/DB service | Node/static + PC/Mobile E2E、必要時のみlive-write |
| Supabase migration/RLS | `audit:migrations` + `audit:security` + live DB invariant + `verify` |
| Import/normalization | Node regression + PC/Mobile relevant E2E + save/reload確認 |

## 13. 不具合修正時

不具合を直す場合は、可能な限り次の順にする。

1. 再現条件を固定する
2. 既存テストがなぜ検出しなかったか確認する
3. 最小の回帰テストを追加する
4. 修正する
5. 関連レイヤーだけ先に高速確認する
6. 最終的に `npm run verify`
7. 必要なPlaywright/Visualを実行する

テストがflakyな場合、単純rerunだけで通してmergeしない。原因が環境・タイミング・実装のどれかを切り分ける。

## 14. CIとローカル確認の関係

CI成功は必要条件だが、UI変更では十分条件ではない。

特に以下は目視/実ブラウザ確認を追加する。

- 表の列幅
- 横スクロール
- sticky UI
- dialog/focus
- Mobile viewport
- theme visual
- animation timing

一方、手作業で動いたことを理由にCI失敗を無視しない。

## 15. テスト文書の更新

以下を変える場合は本資料と `tests/e2e/README.md` / manifest / quality gateを同時に見直す。

- E2E分類
- live-write条件
- required workflow
- required script
- test owner scope
- CI concurrency
- environment variable contract
