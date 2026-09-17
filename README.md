# TNX CAST ARCHIVE

トーキョーN◎VAのキャスト、トループ、アクト関連データを管理・閲覧するWebアプリケーションです。

このプロジェクトを人間またはAIが変更する場合、最初に [`docs/AI_HANDOFF.md`](docs/AI_HANDOFF.md) を読んでください。設計判断、テスト方針、環境差、変更手順をまとめています。

## リポジトリ

| 用途 | Repository | 原則 |
|---|---|---|
| 検証 | `inarin14311431/tnx-cast-archive-test` | 変更・回帰確認・PRを先に行う |
| 本番 | `inarin14311431/tnx_cast_list` | 検証済み変更のみ同期する |

作業前に、現在どちらのリポジトリを扱っているか必ず確認してください。

## 最初に読む資料

1. [`docs/AI_HANDOFF.md`](docs/AI_HANDOFF.md) — AI/新規担当者向けの入口
2. [`docs/DESIGN_PRINCIPLES.md`](docs/DESIGN_PRINCIPLES.md) — 設計理念と禁止事項
3. [`docs/ARCHITECTURE_OVERVIEW.md`](docs/ARCHITECTURE_OVERVIEW.md) — システム構成と責務境界
4. [`docs/TESTING_STRATEGY.md`](docs/TESTING_STRATEGY.md) — テスト階層、CI、DB安全策
5. [`docs/CHANGE_MANAGEMENT.md`](docs/CHANGE_MANAGEMENT.md) — 変更から本番反映までの手順
6. [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md) — 現在のFIX点と停止中作業

領域別の既存資料も必ず参照してください。

- `docs/CSS_ARCHITECTURE.md`
- `docs/THEME_SYSTEM.md`
- `docs/OUTFIT_DATA_ARCHITECTURE.md`
- `docs/DATABASE_MIGRATIONS.md`
- `tests/e2e/README.md`

## 基本確認コマンド

```bash
npm install
npm run verify
```

`npm run verify` は静的監査、runtime契約、セキュリティ、マイグレーション、Node回帰テスト等をまとめて確認します。

Playwrightの実行方法には環境差があります。検証側の `e2e:ci-*` / `e2e:live-write` コマンドは、2026-09-17時点の本番側には未導入です。本番の既存CIには保存・原状復帰テストも含まれます。実行前に [`docs/TESTING_STRATEGY.md` の環境差](docs/TESTING_STRATEGY.md#6-playwright-e2e分類) と、そのrepoの `package.json` / `.github/workflows/playwright.yml` を確認してください。

個別のlive-write確認は通常確認では追加実行しません。共有DBへの書込みは `docs/TESTING_STRATEGY.md` と `tests/e2e/README.md` の対象制限・復元条件に従います。
