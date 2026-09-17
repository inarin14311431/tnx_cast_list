# 現在地 / Current State

最終更新: 2026-09-17

この文書は、AIや新規担当者が「何が完了済みで、何が途中か」を誤認しないためのスナップショットである。時点情報なので、作業再開時はGitHub上のmain/PR/branchを再確認すること。

## 1. Runtime同期FIX基準点

### 検証repo

- Repository: `inarin14311431/tnx-cast-archive-test`
- runtime基準: `4e333f5193c91bc90a03db1449cd8f5948d25944`

### 本番repo

- Repository: `inarin14311431/tnx_cast_list`
- runtime基準: `7f2d202459a8dedd442642ce8819379083615a47`

本番側の上記commitは、検証PR #374 / `4e333f5` までのruntimeを同期したFIX点として記録されている。共有Supabase/DB変更は含まれていない。

これらは **runtime/applicationの同期基準** であり、設計資料やREADMEだけのcommitによって各repoのmain SHAはその後進む。最新main SHAを固定値としてこの文書に持たない。作業開始時にGitHubから取得すること。

## 2. 直近で完了済みの基準状態

検証と本番は、ACT SHOWCASE専用テーマ、表示契約、ACT TRAILER関連修正と、それらに対応する回帰/E2E変更を含むruntime状態まで同期済み。

これはテスト・CI構成全体の同期完了を意味しない。2026-09-17の照合では、アプリruntimeのファイルは一致する一方、npm scripts、E2E分類runner、一部spec、workflowには環境差がある。本番には検証専用の `e2e:ci-*` / `e2e:live-write` / `audit:e2e` が未導入で、既存CIには `audit-coverage.spec.js` の保存・原状復帰テストが含まれる。

詳細は [`TESTING_STRATEGY.md` 第6節](TESTING_STRATEGY.md#6-playwright-e2e分類)。引き継ぎ資料の同期とテスト構成の同期を別の作業として扱い、共通化実装の保留は維持する。

このFIX点以前の中途半端なPR/branchを現在仕様より優先しない。

## 3. 停止中: PC/Mobile共通化

ユーザー指示により、共通化実装は一旦停止中。

### `refactor/navigation-shared-core`

このbranchはruntime基準 `4e333f5` から作成され、その時点ではmainと完全同一だった。

2026-09-17時点:

- runtime共通化のcommit: **0**
- runtime変更: なし
- その後mainにはAI引き継ぎ資料などdocumentation-only commitが追加されているため、最新mainとのahead/behind数は再確認が必要

branch名は存在するが、実装済みではない。

### `audit/pc-mobile-commonization`

調査専用branch。

追加したもの:

- 共通化候補を抽出するaudit script
- audit用GitHub Actions workflow
- 機械解析report
- 人手review report

runtimeアプリの共通化実装branchではない。

## 4. 共通化調査の結論

### 既に共通化されている重要領域

Mobile新規キャスト技能生成は、sharedな以下を利用している。

- `sheet-new-character-state.js`
- `sheet-save-payload.js`

したがって、新規技能初期値・保存payloadは「今後初めて共通化する領域」ではない。今後は同値回帰テストを維持する。

### 優先候補

1. Navigation / URL pure logic
2. Snapshot Supabase service
3. Public ID / small URL utility
4. PC/Mobile同値contract testの強化

### 現時点で統合しないもの

- `sheet-save-coordinator.js`
- `sheet-mobile-save-coordinator.js`

理由: 名前は似ているが責務が異なる。

PC側はdirty/saving/pending/revisionを持つsave state machine。
Mobile側はDOM保存ボタンと `tnx:mobile-before-save` のtask aggregationが中心。

無理に統合するとUI依存がshared coreへ入る。

## 5. Navigation共通化で追加確認された範囲

共通化候補は以下2ファイルだけではない。

- `js/sheet-navigation-context.js`
- `js/sheet-mobile-navigation-context.js`
- `js/mobile-editor-route.js`

`mobile-editor-route.js` にもallowed return page、same-origin、local href生成の類似処理がある。

再開時は3箇所を含めて責務を整理してからshared coreを設計する。

## 6. Navigation共通化の安全な方向

shared core候補:

- allowed return page set
- same-origin return validation
- return URL parse
- URL → local href
- default return解決
- public ID等の小さいquery utility

UI側へ残す:

- PC headerのlabel更新
- Mobile `aria-label`
- view/PC/MobileリンクのDOM更新
- save後のhistory操作
- click event wiring

## 7. Snapshot共通化の安全な方向

shared service候補:

- `listSnapshots(characterId)`
- `createSnapshot(characterId, label)`
- `createBundleSnapshot(characterId, data, label)`
- `restoreSnapshot(snapshotId)`
- `deleteSnapshot(snapshotId)`

UIへ残す:

- dirty判定
- confirm
- alert/focus
- message
- PC/Mobile render
- section injection

## 8. 監査方式

repo全体をAIセッションへ大量取得するとtimeoutしやすいため、今後の大規模監査では以下を推奨する。

1. GitHub Actionsでrepoをcheckout
2. audit scriptで構造/重複候補を抽出
3. Markdown reportを生成
4. AIは上位候補だけ行範囲指定で読む
5. 人手/AIレビューで責務を判定

全文一括取得を標準調査方法にしない。

## 9. 次に共通化を再開する場合

推奨順:

1. 最新mainを再確認
2. `refactor/navigation-shared-core` と最新mainのdiffを確認し、必要なら最新mainから新branchを切り直す
3. Navigation関連3ファイルを再取得
4. pure core APIを先にテストで定義
5. shared module追加
6. PC adapter切替
7. Mobile adapter切替
8. `mobile-editor-route.js` 切替
9. Node test + `audit:modules` + `audit:sheet` + `audit:mobile`
10. `npm run verify`
11. `ci-editor` + `ci-mobile`
12. 検証PR

Snapshot共通化はNavigation完了後に別PRとする。

## 10. 現在優先して守るべき資料

- `docs/AI_HANDOFF.md`
- `docs/DESIGN_PRINCIPLES.md`
- `docs/ARCHITECTURE_OVERVIEW.md`
- `docs/TESTING_STRATEGY.md`
- `docs/CHANGE_MANAGEMENT.md`
- `docs/OUTFIT_DATA_ARCHITECTURE.md`
- `docs/DATABASE_MIGRATIONS.md`
- `docs/CSS_ARCHITECTURE.md`
- `docs/THEME_SYSTEM.md`
- `tests/e2e/README.md`

本資料と実コードが食い違った場合は、最新mainのコード・test・migration・workflowを確認し、必要なら本資料を更新する。
