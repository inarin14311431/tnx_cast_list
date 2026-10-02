# 現在地 / Current State

最終更新: 2026-10-02

AIや新規担当者が「何が完了済みで、何が途中か」を誤認しないためのスナップショット。時点情報
なので、作業再開時はGitHub上のmain/PR/branchを再確認すること。

## 1. Runtime同期基準点

- 検証repo main: `fd683d8`(PR #477 マージ点, 2026-10-02)
- 本番repo main: 検証PR #477までのruntime同期PRのmerge commit(同期元: 検証 `fd683d8`)。同期前の
  本番mainは `39dcac6`。merge後のSHAは本番repoの同期PRを参照。
- runtime同期済み範囲: 検証PR #477まで(`.owned-cast__hint`と`20260930_character_share_links.sql`
  /manifest行を含む)。`20260930_character_share_links.sql`は稼働中DB定義の記録でありrepoへの
  commitのみ、実DBへの適用はしない。共有Supabase/DBの変更は含まれない。

**runtime/applicationの同期基準**であり、設計資料やREADMEだけのcommitで各repoのmain SHAは
その後進む。固定値を最新mainと解釈しないこと。テスト・CI構成の同期は別で、意図的に同期しない
(`AGENTS.md`参照)。

## 2. 進行中・停止中の作業とbranch

2026-10-02時点、検証repoに開いているPRはない。旧調査branch(`refactor/navigation-shared-core`・
`audit/pc-mobile-commonization`)は削除済み。他の未PR branchは本資料で維持しない。再開前に
必ず最新mainとのdiffを確認し、branch名だけで「変更済み/不要」と判断しないこと。

## 3. 現時点で統合しないもの

`sheet-save-coordinator.js`(PC)と`sheet-mobile-save-coordinator.js`(Mobile)は名前が似ているが
責務が異なる(PCはsave state machine、Mobileは保存ボタンDOMと`tnx:mobile-before-save`の
task aggregationが中心)。無理に統合するとUI依存がshared coreへ入るため統合しない。

## 4. 次の共通化候補: js/cast-ui.js

`js/cast-ui.js`には`js/sheet-navigation-core.js`と同種の重複ロジック(`PARENT_RETURN_PAGES`、
`parseReturnDestination`、`parentReturnHref`相当)が存在する。他の責務(スタイル/能力値/技能/
アウトフィット等のDOM描画)との切り分けは未調査。詳細・推奨手順は
`docs/archive/CURRENT_STATE_20260925.md`第10節。

act-showcaseの「本体が作ったものを削除して作り直す」重複(`js/act-showcase-board-layout.js`等)も
未着手。詳細は`docs/archive/CURRENT_STATE_20260925.md`第11節。

## 5. 既知の制限

- `js/sheet-mobile-image.js`はサムネイル生成未対応。画像差し替え・解除時は旧サムネイルを削除
  するが新サムネイルは生成しない。
- `js/showcase-guests.js`は対象外(別テーブル`act_showcase_guests`、`image_thumbnail_url`列なし)。

## 6. 完了済み作業(詳細は`docs/archive/CURRENT_STATE_20260925.md`)

- Navigation共通化(09-19): `js/sheet-navigation-core.js`
- Snapshot共通化(09-19): `js/sheet-snapshot-service.js`
- Public ID utility共通化(09-20): `js/public-id-param.js`
- act-showcase重複ロジック整理(09-21〜22、一部): タグライン/ハンドアウト/タイトルfont分類/
  credits・act-metaパネル/overview/trailerの重複排除
- Supabase画像変換API依存廃止・自前サムネイル生成への切替(09-25): `image_thumbnail_url`列追加、
  バックフィル108/125件完了
