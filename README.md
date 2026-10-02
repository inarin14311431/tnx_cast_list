# TNX CAST ARCHIVE

トーキョーN◎VAのキャスト、トループ、アクト関連データを管理・閲覧するWebアプリケーションです。

このプロジェクトを変更する人・AIは、最初に [`AGENTS.md`](AGENTS.md) を読んでください。設計判断、
テスト方針、変更手順と、領域別資料への対応表をまとめています。

## リポジトリ

| 用途 | Repository | 原則 |
|---|---|---|
| 検証 | `inarin14311431/tnx-cast-archive-test` | 変更・回帰確認・PRを先に行う |
| 本番 | `inarin14311431/tnx_cast_list` | 検証済み変更のみ同期する |

作業前に、現在どちらのリポジトリを扱っているか必ず確認してください。

## 基本確認コマンド

```bash
npm install
npm run verify
```

`npm run verify` は静的監査、runtime契約、セキュリティ、マイグレーション、Node回帰テスト等をまとめて確認します。

Playwrightの実行方法やE2E分類、共有DBへの書込み制限・復元条件は [`docs/TESTING_STRATEGY.md`](docs/TESTING_STRATEGY.md) を参照してください。
