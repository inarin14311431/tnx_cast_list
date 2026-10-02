# AGENTS.md

このリポジトリで作業する全AI共通の入口。作業前にまず読む。

## プロジェクト概要

『トーキョーN◎VA THE AXLERATION』の非公式ファンツール、キャラクターシート管理サイト
「CAST ARCHIVE」。純粋な静的サイト(ビルドツールなし、ES Modules + Supabase)。

## リポジトリと環境

| 役割 | Repository | 原則 |
|---|---|---|
| 検証 | `inarin14311431/tnx-cast-archive-test` | 実装・テストはここで行う |
| 本番 | `inarin14311431/tnx_cast_list` | 検証で確認が取れたものだけを同期する |

- 検証・本番は**同一のSupabaseプロジェクト**(`koprmbkoftuuffslhsvt`)を共有する。DBへのDDL変更
  (migration実行)は、repoへのcommitと実DBへの適用を別ゲートとして扱い、実DB適用は必ず明示的な
  確認を取ってから行う。
- 検証・本番でruntime(js/css-next/*.html/config/supabase)は同一に保つが、テスト構成(tests/配下、
  CI設定)は意図的に異なり、テストファイルは同期しない。
- 作業前に、今どちらのrepo/branchにいるかを必ず確認する。runtime同期の現状とFIX点は
  [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md) を見る(固定SHAはそちらにのみ置き、ここには書かない)。

## 最優先事項

1. **既存データを壊さない。** UI改善よりデータ整合性を優先する。
2. **検証環境で先に確認する。** 本番repoを直接実験場所にしない。
3. **責務境界を崩さない。** 共通ロジック、PC UI、Mobile UI、DB永続化を無理に一体化しない(下記参照)。
4. **既存の正規値・互換ルールを確認してから変更する。** 特にアウトフィット、JSONP取込、旧データ
   互換は見た目だけで判断しない。
5. **テストを弱めて変更を通さない。** 失敗したテストは、まず実装かテスト前提のどちらが誤っているか調査する。
6. **秘密情報をコード・issue・PR・チャットへ書かない。** service-role keyやテスト用パスワードを保存しない。

詳細は`docs/DESIGN_PRINCIPLES.md`(下記対応表)。

## 作業開始時の確認

コードを変更する前に最低限確認する: 今いるrepo名とbranch名/mainの最新SHA/変更対象ファイルの
現行実装/関連する`docs/`資料(下記の対応表)/関連するNodeテスト・audit・E2E/DB schema・
migration・RLSへの影響/PCとMobile双方に同じ業務ルールが存在するか/既存の共通moduleの有無。

大量のrepo内容を一度に取得する必要はない。構造調査はaudit scriptやファイル単位・行範囲単位の
取得を優先する。

## 責務境界: Shared core / PC・Mobile

**Shared coreへ置くもの**: 保存payload生成、正規化・変換、初期値生成、URLやIDの純粋な解釈、
DB CRUD/RPCのうちUIに依存しないservice、数値計算やルール判定。

**PC/Mobile側へ残すもの**: DOM取得・描画、ボタン状態、モーダル/ダイアログ、focus制御、
PC/Mobile固有のイベント連携、レスポンシブUI都合の表示処理。

PC/Mobileのファイル名が似ているだけで統合しない。責務が同じかを確認する。共通化済み領域・
進行中の判断は`docs/CURRENT_STATE.md`。

## DB / Securityの禁止事項

- ブラウザJSへservice-role credentialを入れない。
- 適用済みmigrationを整理目的で編集・削除・renameしない。過去migrationを再実行して現在DBを
  合わせようとしない。
- RLSやSECURITY DEFINERをUI都合だけで緩めない。
- public return URLやlogin return先のsame-origin制約を外さない。
- live DBへ対象を限定しないUPDATE/DELETEを実行しない。

新しいDB変更は新規migrationとして追加し、repository manifestとlive stateを別々に確認する。

## 必須コマンド

- `npm run verify` — 全audit/report + 全テストを実行する最終確認コマンド。**通常は作業の最後に
  1回だけ**実行する。途中は`node --test tests/該当ファイル.test.mjs`のように関連ファイルだけを
  絞って実行する。
- 出力は成功時1行(`VERIFY OK: ...`)、失敗時も要点のみ(ステップ名・テスト名・場所・エラー内容)。
  詳細が必要な時だけ失敗したステップを個別実行する(`npm run test:verbose`、`npm run audit:*`に
  `-- --verbose`。対応は現状`audit:js-baseline`のみ)。`VERIFY_VERBOSE=1 npm run verify`は最後の
  手段。
- `npm run audit:*`は個別監査(循環依存・移行整合性など)。必要な時だけ実行する。

## 変更の進め方

1. mainから作業branchを切る(1つの目的に絞る)
2. 関連テストを追加・更新し、`npm run verify`で確認する
3. 必要なE2E/Visual/Qualityを実行する
4. commit・push・PR作成
5. 目視確認が必要な変更(見た目・タイミング絡み)は、実機/Playwrightで実際に確認してから報告する。
   「直したはず」で終わらせない。
6. JSの版数(`?v=`)を上げたら`npm run preload:update`を実行する。
7. DB変更を含む場合は、live state確認・migration適用確認を追加する(実DB適用は明示的な確認を
   取ってから)。

## テストについて絶対に守ること

- 失敗したテストは、まず実装とテストのどちらが誤っているかを調査する。テストを弱めて変更を
  通さない。
- 過去のPRの記録(コミットメッセージ)と実際の挙動が食い違う場合は、その場で確認し、正直に報告
  する。憶測で「たぶん大丈夫」と言わない。
- 安全に直せないと分かった場合は、無理に押し通さず変更を元に戻し、分かったことを正直に報告する。

## 確認の手厚さ・コストを抑える習慣

- 確認の手厚さは変更の種類で決める(指示に指定があればそちらを優先)。
  - 見た目を変えない変更(リファクタ・ロジック・テスト): `npm run verify`とCIのみ。Playwright
    目視確認はしない。
  - 見た目の変更: スクリーンショットは1440pxと1024pxの2枚まで。
  - 大きな見た目の変更: 指示で指定された幅・データだけ追加確認する。
- ログ・ファイル・差分は必要な範囲だけ読む(`tail`/`grep`/行範囲指定、`git diff --stat`を先に見
  てから中身を読む)。大きなファイルや長い出力を丸ごと読まない。
- 「repoを見回して」のような曖昧な依頼を避け、対象ファイル・原因の仮説を先に絞る。
- 報告は要点だけ: PRのURL、CIの結果、仕様から外れた点とその理由。

## 資料を更新すべき変更

次の場合はコードと同じPRで文書も更新する: 正規データの所在、module責務、PC/Mobile共通化境界、
CSS/Themeのownership、migration運用、CI/test分類、本番反映手順のいずれかを変える場合。

AIにとって文書は補助メモではなく、コードとテストと並ぶ設計契約として扱う。

## 触る場所 → 読む資料

変更対象に応じて、該当する資料だけを読む。全資料を毎回読む必要はない。

| 触る場所 | 読む資料 |
|---|---|
| アウトフィット | `docs/OUTFIT_DATA_ARCHITECTURE.md` |
| DB migration | `docs/DATABASE_MIGRATIONS.md`, `supabase/README.md` |
| CSS | `docs/CSS_ARCHITECTURE.md` |
| Theme | `docs/THEME_SYSTEM.md` |
| テスト/CI | `docs/TESTING_STRATEGY.md`, `tests/e2e/README.md` |
| CI失敗調査 | `docs/CI_FAILURE_INVESTIGATION.md` |
| 本番反映・PR運用 | `docs/CHANGE_MANAGEMENT.md` |
| 設計判断に迷う | `docs/DESIGN_PRINCIPLES.md` |
| 全体構成 | `docs/ARCHITECTURE_OVERVIEW.md` |
| 進行中の作業・同期基準点 | `docs/CURRENT_STATE.md` |
| SKD/OFC検索の設定 | `supabase/MASTER_SEARCH_SETUP.md` |

`docs/archive/` は履歴であり、通常作業では読まない。
