# AI HANDOFF GUIDE

最終更新: 2026-09-17

この文書は、TNX CAST ARCHIVEを新しいAIセッション・別AI・新規担当者へ引き継ぐ際の最初の入口である。

## 1. このプロジェクトで最優先すること

1. **既存データを壊さない。** UI改善よりデータ整合性を優先する。
2. **検証環境で先に確認する。** 本番repoを直接実験場所にしない。
3. **責務境界を崩さない。** 共通ロジック、PC UI、Mobile UI、DB永続化を無理に一体化しない。
4. **既存の正規値・互換ルールを確認してから変更する。** 特にアウトフィット、JSONP取込、旧データ互換は見た目だけで判断しない。
5. **テストを弱めて変更を通さない。** 失敗したテストは、まず実装かテスト前提のどちらが誤っているか調査する。
6. **秘密情報をコード・issue・PR・チャットへ書かない。** service-role keyやテスト用パスワードを保存しない。

詳細は `DESIGN_PRINCIPLES.md` を参照すること。

## 2. 環境

| 役割 | Repository | mainの扱い |
|---|---|---|
| 検証 | `inarin14311431/tnx-cast-archive-test` | 先行実装・CI・回帰確認の基準 |
| 本番 | `inarin14311431/tnx_cast_list` | 検証済み変更の同期先 |

2026-09-17時点の **runtime同期FIX基準点**:

- 検証 runtime基準: `4e333f5193c91bc90a03db1449cd8f5948d25944`
- 本番 runtime基準: `7f2d202459a8dedd442642ce8819379083615a47`
- 本番側の上記コミットは、検証PR #374 / `4e333f5` までのruntime同期を明記している。

これらは「アプリ実装が同期している基準点」であり、READMEや設計資料だけのcommitによって各repoの最新main SHAはその後進む。**作業開始時は必ずGitHubから最新main SHAを取得し、この文書の固定SHAを最新mainだと解釈しないこと。**

Supabaseはliveテスト時に共有状態へ触れる可能性がある。repoが分かれていても、DB書込みテストを並行・無制限に実行してよいとは考えないこと。

## 3. 作業開始時の確認

AIはコードを変更する前に最低限以下を確認する。

1. 今いるrepo名とbranch名
2. mainの最新SHA
3. 変更対象ファイルの現行実装
4. 関連する `docs/` 資料
5. 関連するNodeテスト、audit、E2E
6. DB schema / migration / RLSに影響するか
7. PCとMobileの双方に同じ業務ルールが存在するか
8. 既存の共通moduleが既に存在しないか

大量のrepo内容を一度にAIへ取得する必要はない。構造調査はGitHub Actions、audit script、ファイル単位・行範囲単位の取得を優先する。

## 4. コードの責務境界

### Shared coreへ置くもの

- 保存payload生成
- 正規化・変換
- 初期値生成
- URLやIDの純粋な解釈
- DB CRUD/RPCのうちUIに依存しないservice
- 数値計算やルール判定

### PC / Mobile側へ残すもの

- DOM取得・描画
- ボタン状態
- モーダル/ダイアログ
- focus制御
- PC/Mobile固有のイベント連携
- レスポンシブUI都合の表示処理

PC/Mobileのファイル名が似ているだけで統合しない。責務が同じかを確認する。

現行例:

- `sheet-new-character-state.js` は新規キャストの技能初期値を共通化している。
- `sheet-save-payload.js` は保存payload生成の共通層である。
- `sheet-save-coordinator.js` と `sheet-mobile-save-coordinator.js` は名前が似ていても責務が異なるため、現時点では統合対象としない。

## 5. データ変更時の重要資料

変更対象に応じて必ず読む。

- アウトフィット: `docs/OUTFIT_DATA_ARCHITECTURE.md`
- DB migration: `docs/DATABASE_MIGRATIONS.md`
- CSS: `docs/CSS_ARCHITECTURE.md`
- Theme: `docs/THEME_SYSTEM.md`
- E2E/live-write: `tests/e2e/README.md`

アウトフィットはトップレベル列と `ofc_details` のハイブリッドであり、どちらか一方を全面的な正規値と解釈してはならない。

## 6. DB / Securityの禁止事項

- ブラウザJSへservice-role credentialを入れない。
- 適用済みmigrationを整理目的で編集・削除・renameしない。
- 過去migrationを再実行して現在DBを合わせようとしない。
- RLSやSECURITY DEFINERをUI都合だけで緩めない。
- public return URLやlogin return先のsame-origin制約を外さない。
- live DBへ対象を限定しないUPDATE/DELETEを実行しない。

新しいDB変更は新規migrationとして追加し、repository manifestとlive stateを別々に確認する。

## 7. テストの基本

通常変更では最低限:

```bash
npm run verify
```

変更内容に応じてPlaywrightを追加する。

- `e2e:ci-public`: 公開画面、意図的live-writeなし
- `e2e:ci-editor`: 認証編集、意図的live-writeなし
- `e2e:ci-mobile`: Mobile回帰
- `e2e:manual-ui`: 特定UI不具合の詳細回帰
- `e2e:live-write`: 明示承認時のみ。共有DBを書き換える

詳細は `TESTING_STRATEGY.md`。

## 8. 変更の進め方

原則:

1. 検証repoのmainから作業branchを切る
2. 1つの目的に絞って変更する
3. 関連テストを追加/更新する
4. `npm run verify`
5. 必要なE2E/Visual/Qualityを実行する
6. PRを作成しCIを確認する
7. 検証mainへmerge
8. 検証環境で動作確認
9. 本番repoへ同期PR
10. 本番CI確認後にmerge

DB変更を含む場合はこの流れにDB live state確認・migration適用確認を追加する。

## 9. 現在停止中の作業

詳細は `CURRENT_STATE.md`。

- `refactor/navigation-shared-core` はruntime基準点から作成済みだが、runtime共通化の実装は開始していない。
- `audit/pc-mobile-commonization` は調査用。runtimeコードの共通化変更ではない。
- 共通化候補として Navigation/URL純粋ロジック、Snapshot DB service、Public ID取得utilityが挙がっている。
- Save CoordinatorのPC/Mobile統合は現時点では見送り。

別AIが作業を再開する場合、ブランチ名だけを見て「変更済み」と判断しないこと。必ず最新mainとのdiffを確認する。

## 10. 資料を更新すべき変更

次の場合はコードと同じPRで文書も更新する。

- 正規データの所在を変える
- module責務を移す
- PC/Mobile共通化境界を変える
- CSS/Themeのownershipを変える
- migration運用を変える
- CI/test分類を変える
- 本番反映手順を変える

AIにとって文書は補助メモではなく、コードとテストと並ぶ設計契約として扱う。
