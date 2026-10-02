# 現在地 / Current State

最終更新: 2026-09-24

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

詳細は [`TESTING_STRATEGY.md` 第6節](../TESTING_STRATEGY.md#6-playwright-e2e分類)。引き継ぎ資料の同期とテスト構成の同期を別の作業として扱い、共通化実装の保留は維持する。

このFIX点以前の中途半端なPR/branchを現在仕様より優先しない。

## 3. PC/Mobile共通化: Navigation・Snapshot・Public ID utility完了

Navigation(戻り先URL解決)、Snapshot Supabase service、Public ID/小さいURL utilityの共通化はいずれも完了した。第4節「優先候補」に元々挙がっていた4項目(Navigation/Snapshot/Public ID/PC-Mobile同値contract強化)が出揃ったため、次の一歩は第10節を参照。

### Navigation共通化(完了、2026-09-19)

- 共有コア: `js/sheet-navigation-core.js`(UI非依存の純粋関数のみ)
  - データ: `RETURN_DESTINATIONS`(許可ページごとのPC label/en label/Mobile aria-label)、`PARENT_RETURN_PAGES`、`DEFAULT_RETURN_HREF`
  - 関数: `readTrimmedSearchParam`、`toLocalHref`、`parseReturnDestination`、`resolveParentReturnHref`
- PC adapter: `js/sheet-navigation-context.js`。UI側の責務(headerラベル更新、view linkのDOM更新、save後のhistory操作、click/MutationObserver配線)はこのファイルに残置。
- Mobile adapter: `js/sheet-mobile-navigation-context.js`。UI側の責務(aria-label更新、forwardリンクのcontextualize、click配線)はこのファイルに残置。
- `js/mobile-editor-route.js` も同じcoreへ切替済み。classic script(`type="module"`ではない)のため、`sheet-open-at-top.js`と同じ動的`import("./sheet-navigation-core.js?v=1")`パターンで読み込む。
- 契約テスト:
  - `tests/sheet-navigation-core.test.mjs`: pure core自体の挙動(same-origin検証、許可ページ判定、default解決)と、PC/Mobile同値contract(同じ`return`値に対してPC・Mobile双方が同じhrefへ解決すること)。
  - `tests/navigation-return-context-contract.test.mjs`: 各adapterの配線(どのファイルがcoreをimportしているか、UI更新ロジックが残っているか)。

追加確認: `js/cast-ui.js` にも同種の重複ロジック(`PARENT_RETURN_PAGES`、`parseReturnDestination`、`parentReturnHref`相当)が存在する。今回のスコープには含めていない。次に着手する場合の候補として記録する。

### `refactor/navigation-shared-core`(旧branch、未使用のまま)

このbranchはruntime基準 `4e333f5` から作成されたが、その後実装が進まなかった。2026-09-19時点でも最新mainとの差分はruntime変更0件のまま。Navigationの実装は、このbranchを再利用せず最新mainから新規に切った `feat/navigation-shared-core` で行った。今後不要なら削除を検討してよい。

### `audit/pc-mobile-commonization`

調査専用branch。

追加したもの:

- 共通化候補を抽出するaudit script
- audit用GitHub Actions workflow
- 機械解析report
- 人手review report

runtimeアプリの共通化実装branchではない。

### Snapshot共通化(完了、2026-09-19)

- 共有コア: `js/sheet-snapshot-service.js`。Supabase呼び出しのみを持ち、DOM操作は一切含めない。
  - 定数: `MAX_SNAPSHOTS`
  - 純粋関数: `formatDate(value)`
  - Supabase呼び出し関数: `listSnapshots(characterId)`、`createSnapshot(characterId, label)`、`createBundleSnapshot(characterId, data, label)`、`restoreSnapshot(snapshotId)`、`deleteSnapshot(snapshotId)`。いずれもSupabaseの`{data,error}`をそのまま返し、throwするかどうかは呼び出し側(PC/Mobile)に委ねる。各関数はテスト用に`client`を最終引数として差し替え可能(既定値は実際の`supabase`クライアント)。
- PC adapter: `js/sheet-snapshots.js`。UI側の責務(dirty判定 `hasUnsavedSheetChanges()`/`focusSheetSaveButton()`、confirm/alert、message表示、render()のDOM生成、panel/list要素の取得・イベント配線)は残置。公開API `globalThis.TNXSheetSnapshots` の形は変更していない。
- Mobile adapter: `js/sheet-mobile-snapshots.js`。UI側の責務(dirty判定はDOM datasetを直接参照、message表示、render()のDOM生成、section injection、イベント配線)は残置。PC限定機能`createBundleSnapshot`は呼んでいないため、対応する関数をimportしていない。
- 契約テスト: `tests/sheet-snapshot-service.test.mjs`(新設)。既存のテストにSupabaseクライアントをモック/スタブする慣習がなかったため、`client`引数へ差し込む簡易な記録用フェイクclientをテストファイル内に自作し、各関数が正しいテーブル/RPC名・パラメータでSupabaseを呼んでいること、エラーをthrowせずそのまま返すことを検証している。既存の`tests/snapshots.test.mjs`・`tests/sheet-mobile-architecture.test.mjs`・`tests/character-sheet-compare-contract.test.mjs`も、共有coreへ移動したリテラル(RPC名・テーブル名・`MAX_SNAPSHOTS`定義)の参照先を`js/sheet-snapshot-service.js`側へ更新した。

### Public ID / 小さいURL utility共通化(完了、2026-09-20)

当初は `js/sheet-image.js` の `getPublicId()` と `js/sheet-mobile-runtime.js` の `getMobilePublicId()` の2箇所の重複として記録されていたが、実際に調べると重複範囲はもっと広く、以下4箇所に実質同一の実装(`new URLSearchParams(location.search).get("id")?.trim() || ""`相当)が個別に存在した。

- `js/cast-data-store.js`: `getPublicId()`
- `js/cast.js`: `getPublicId()`(`window.location.search`・`??`を使用。他の3つは`location.search`・`||`を使用していたが、空文字列に対する挙動は同一)
- `js/sheet-image.js`: `getPublicId()`
- `js/sheet-mobile-runtime.js`: `getMobilePublicId()`(export済みで、`getMobileEditorContext()`が内部で利用)

- 共有コア: `js/public-id-param.js`(新規、「sheet」に限定しない汎用モジュールのため`sheet-`接頭辞なし。`outfit-ofc-utils.js`と同じ命名慣習)
  - `getPublicIdParam(search = location.search)`: DOM/locationへ直接依存しすぎないよう`search`を注入可能にした純粋関数。引数省略時のみ`location.search`を参照する。
- `js/cast-data-store.js` / `js/cast.js` / `js/sheet-image.js`: 自前の`getPublicId()`を削除し、`import { getPublicIdParam as getPublicId } from "./public-id-param.js?v=1";`へ置き換えた。ファイル内の既存呼び出し箇所(`getPublicId()`)は変更していない。
- `js/sheet-mobile-runtime.js`: 自前実装を削除し、`getPublicIdParam`をimportした上で`export { getPublicIdParam as getMobilePublicId };`として再export。この形にした理由: `export { X as Y } from "..."`という再exportのみの構文だとこのファイル自身の中で`Y`(`getMobilePublicId`)を使えない(ローカルbindingを作らないため)。`getMobileEditorContext()`内部で`getMobilePublicId()`相当の処理を呼んでいるため、import + ローカルexportの形にして内部からは`getPublicIdParam()`を直接呼ぶようにした。外部の既存importerからは引き続き`getMobilePublicId`という名前でimportできる。
- 契約テスト: `tests/public-id-param.test.mjs`(新設)。通常取得・trim・未指定時の空文字列・search文字列を引数で渡せることを検証。
- 既存テスト`tests/sheet-image-save-state-boundary.test.mjs`は`js/sheet-image.js`内の呼び出し箇所(`const publicId=getPublicId()`)をそのまま検証しており、変更不要だった。

## 4. 共通化調査の結論

### 既に共通化されている重要領域

- `sheet-new-character-state.js` / `sheet-save-payload.js`: Mobile新規キャスト技能生成が利用。新規技能初期値・保存payloadは「今後初めて共通化する領域」ではない。今後は同値回帰テストを維持する。
- `sheet-navigation-core.js`: PC (`sheet-navigation-context.js`)、Mobile (`sheet-mobile-navigation-context.js`)、`mobile-editor-route.js` の3箇所が利用する戻り先URL解決ロジック(許可ページ集合、same-origin検証、parse、URL→local href変換、デフォルト解決、query utility)。今後は `tests/sheet-navigation-core.test.mjs` の同値契約テストを維持する。
- `sheet-snapshot-service.js`: PC (`sheet-snapshots.js`)、Mobile (`sheet-mobile-snapshots.js`) が利用するSnapshot用Supabase呼び出し(一覧取得・通常作成・比較版作成・復元・削除)と`formatDate`。今後は`tests/sheet-snapshot-service.test.mjs`を維持する。
- `public-id-param.js`: `js/cast-data-store.js`・`js/cast.js`・`js/sheet-image.js`・`js/sheet-mobile-runtime.js`(re-export経由)の4箇所が利用するURLの`id`パラメータ取得ロジック。今後は`tests/public-id-param.test.mjs`を維持する。

### 優先候補

第3節の4項目(Navigation/Snapshot/Public ID/PC-Mobile同値contract強化)はすべて対応済み。次の一歩は第10節の`js/cast-ui.js`調査を参照。PC/Mobile同値contract testの強化は、新しい重複が見つかった領域ごとに今後も継続する。

### 現時点で統合しないもの

- `sheet-save-coordinator.js`
- `sheet-mobile-save-coordinator.js`

理由: 名前は似ているが責務が異なる。

PC側はdirty/saving/pending/revisionを持つsave state machine。
Mobile側はDOM保存ボタンと `tnx:mobile-before-save` のtask aggregationが中心。

無理に統合するとUI依存がshared coreへ入る。

## 5. Navigation共通化で確認した対象範囲(完了)

共通化候補は当初想定の2ファイルだけではなく、以下3ファイルだった。

- `js/sheet-navigation-context.js`
- `js/sheet-mobile-navigation-context.js`
- `js/mobile-editor-route.js`

`mobile-editor-route.js` にもallowed return page、same-origin、local href生成の類似処理があり、3箇所とも `js/sheet-navigation-core.js` へ切替済み。

なお `js/cast-ui.js` にも同種の重複ロジックがあることを追加確認したが、今回のスコープには含めていない(第3節参照)。

## 6. Navigation共通化で実装した内容

shared core (`js/sheet-navigation-core.js`) に含めたもの:

- allowed return page set (`RETURN_DESTINATIONS` / `PARENT_RETURN_PAGES`)
- same-origin return validation (`parseReturnDestination`内)
- return URL parse (`parseReturnDestination`)
- URL → local href (`toLocalHref`)
- default return解決 (`resolveParentReturnHref` + `DEFAULT_RETURN_HREF`。`mobile-editor-route.js`はページ文脈依存のfallbackを呼び出し側で指定)
- public ID等の小さいquery utility (`readTrimmedSearchParam`)

UI側(各adapterファイル)へ残したもの:

- PC headerのlabel更新
- Mobile `aria-label`
- view/PC/MobileリンクのDOM更新
- save後のhistory操作
- click event wiring

## 7. Snapshot共通化で実装した内容

shared core (`js/sheet-snapshot-service.js`) に含めたもの:

- `MAX_SNAPSHOTS`
- `formatDate(value)`
- `listSnapshots(characterId)`
- `createSnapshot(characterId, label)`
- `createBundleSnapshot(characterId, data, label)`(PC限定機能。Mobileはimportしていない)
- `restoreSnapshot(snapshotId)`
- `deleteSnapshot(snapshotId)`

UI側(各adapterファイル)へ残したもの:

- dirty判定(PC: `hasUnsavedSheetChanges()`/`focusSheetSaveButton()`、Mobile: DOM dataset参照。実装方式が異なるためUI側に残置)
- confirm/alertダイアログ
- message/状態表示
- render()のDOM生成(PC/Mobileでmarkup・class名が異なるため統合せず、両方とも共有coreの`formatDate()`を呼ぶ形に変更)
- section injection(Mobile固有)
- panel/list要素の取得・イベント配線

## 8. Public ID utility共通化で実装した内容

shared core (`js/public-id-param.js`) に含めたもの:

- `getPublicIdParam(search = location.search)`: URLの`id`クエリパラメータをtrimして返す唯一の関数。`search`を引数で注入可能にし、テストが`location`のグローバルに依存しないようにした。

adapter側の扱い:

- `js/cast-data-store.js` / `js/cast.js` / `js/sheet-image.js`: `getPublicIdParam`を`getPublicId`という名前でimportし、既存の呼び出し箇所は無変更。
- `js/sheet-mobile-runtime.js`: `getPublicIdParam`をimportした上で`getMobilePublicId`として再export。ファイル内部では`getPublicIdParam`を直接呼ぶ(理由は第3節参照)。

この領域にはUI側の責務がほぼ存在しない(単なるURLパラメータ読み取りのため)。

## 9. 監査方式

repo全体をAIセッションへ大量取得するとtimeoutしやすいため、今後の大規模監査では以下を推奨する。

1. GitHub Actionsでrepoをcheckout
2. audit scriptで構造/重複候補を抽出
3. Markdown reportを生成
4. AIは上位候補だけ行範囲指定で読む
5. 人手/AIレビューで責務を判定

全文一括取得を標準調査方法にしない。

## 10. 次に共通化を再開する場合(js/cast-ui.js調査)

Navigation共通化は第3・5・6節、Snapshot共通化は第3・4・7節、Public ID utility共通化は第3・4・8節の手順でそれぞれ完了した(2026-09-19〜20)。第4節の優先候補4項目は出揃った。

次に着手する場合は、Navigation PRの調査中に見つかった `js/cast-ui.js` の重複を対象とする。`js/cast-ui.js` には `js/sheet-navigation-core.js` と同種の重複ロジック(`PARENT_RETURN_PAGES`、`parseReturnDestination`、`parentReturnHref`相当)が存在することを確認済みだが、`cast-ui.js`自体の他の責務(スタイル/能力値/技能/アウトフィット等のDOM描画)との切り分けをまだ調査していない。推奨順:

1. 最新mainを再確認
2. `js/cast-ui.js` を再取得し、`js/sheet-navigation-core.js`と重複している範囲・していない範囲を洗い出す
3. `js/sheet-navigation-core.js`を再利用できるか(cast.html固有の事情がないか)を判定する
4. pure core APIを先にテストで定義(または既存の`sheet-navigation-core.js`を拡張)
5. `js/cast-ui.js`をcore/adapterへ整理
6. Node test + 関連audit(`audit:modules`など)
7. `npm run verify`
8. `ci-public`(cast-ui.jsは公開閲覧画面が対象)
9. 検証PR

## 11. act-showcase重複ロジックの整理

`js/act-showcase-tagline-quotes.js` と `js/act-showcase-display-normalizer.js` は、同じセレクタ群(`.poster-v2-tagline`等)のタグライン文字列を別ロジックで正規化し、両方とも`document.body`全体をMutationObserverで監視して競合していた。`display-normalizer.js`が呼ぶ`js/showcase-display-format.js`の`formatShowcaseTagline()`は、`tagline-quotes.js`の`normalizeTagline`と引用符ペア配列まで完全に同一だった。

対応(完了、2026-09-21): `formatShowcaseTagline()`に`tagline-quotes.js`側だけが持っていたFALLBACKS除外(`"PUBLIC CAST ARCHIVE"` / `"PUBLIC CAST"`はカギ括弧で囲まない)を移植した上で`js/act-showcase-tagline-quotes.js`を削除し、`act-showcase-bootstrap.js`のimportからも外した。以後、タグライン正規化とMutationObserver監視は`display-normalizer.js`単独が担う。

`js/act-showcase-story-flow.js`の`ensureHandoutContext()`は、ハンドアウト本文を自前の簡易パーサー(`parseHandout`)で解析してENTRY/CONNECTION/PSセルを追加し`dataset.storyConnection`等へ保存していたが、直後に`js/act-showcase-writing-patterns.js`の`normalizeHandoutContext()`/`normalizeAssignedRoute()`がより高度なパーサー(`analyzeHandout`)で同じ本文を再解析し、セルを`replaceChildren`で完全に置き換え、`dataset`値も`.neotokyo-story__assigned-route>strong`のテキストも上書きしていたため、story-flow.js側の解析結果は実質使われずに捨てられていた。

対応(完了、2026-09-21): `ensureHandoutContext()`から`parseHandout`呼び出しとセル追加・`dataset.storySetting`/`storyConnection`/`storyPs`への代入を削除し、`.neotokyo-story__handout-context`セクション・kicker文言・ROLEセルのみを作る「枠組み」構築だけを残した(`is-read`判定・`storyFilled`ガードは維持)。実際のENTRY/CONNECTION/PSセル内容と`assigned-route`の文言決定は、以後`writing-patterns.js`単独が担う。`parseHandout`/`parseField`は他で未使用になったため削除した。目視確認(Playwrightで実行し、修正前・修正後のコミットそれぞれで同一シナリオを実行して結果を比較): ハンドアウト本文が異なる2キャストを含む豪華版アクトを`act-showcase.html`のneotokyo演出で実際に進行させ、ENTRY/CONNECTION/PS/SETTING/HOOKセルの内容と「参加経緯」ボックスの文言が修正前後で完全に一致(JSON差分なし)することを確認した。

`js/act-showcase-finale-enhancer.js`の`classifyTitleFit()`と`js/act-showcase-cinematic-polish.js`の`classify()`(`kind==="title"`)は、文字数によるフォントサイズ分類ロジック(10字以下→short、14字以下→medium、20字以下→long、それ以上→xlong)が完全に同一で、両方とも同じ`.neotokyo-sequence__act-title`に`dataset.fit`を設定していた。

対応(完了、2026-09-21、2回目の試みで成功): 1回目の試み(`finale-enhancer.js`側の`classifyTitleFit()`呼び出しを削除し`cinematic-polish.js`側へ一本化)は`tests/e2e/act-showcase-title-render-order.spec.js`で回帰し失敗した。理由: `finale-enhancer.js`はタイトル要素のクラス変化を検知する自前のMutationObserverコールバック内で`dataset.fit`を**同期的**に設定しているのに対し、`cinematic-polish.js`側は`requestAnimationFrame`で**1フレーム遅延**して実行されるため、タイトルが最初に`is-visible`になった瞬間のフレームでは`dataset.fit`がまだ未設定だった(タイミング保証を持つのは`finale-enhancer.js`側だった)。2回目は逆方向で成功: `finale-enhancer.js`側は一切変更せず、`cinematic-polish.js`の`syncTypography()`から`.neotokyo-sequence__act-title`を対象とする`fit()`呼び出し1行だけを削除した。`classify()`の分類ロジック自体(短い関数)は依然両ファイルに残るが(意図的にそのまま)、同じ要素への重複書き込みはなくなった。目視確認: 文字数が異なる4パターン(5/12/17/21字、short/medium/long/xlong相当)それぞれで`act-showcase.html`のneotokyo演出タイトル画面をPlaywrightで実際に描画し、`dataset.fit`とスクリーンショットが変更前後で完全に一致することを確認した。

`js/act-showcase-page.js`の`createCastGrid()`は、RULER/CAST/KEY STYLEを含む`.poster-v2-panel--credits`パネルを毎回新規に構築していたが、`js/act-showcase-board-layout.js`の`polishBoard()`/`ensureActMeta()`が、そのパネルからRULER/KEY STYLEの値をDOM経由で読み取った直後に`credits.remove()`でパネルごと削除し、代わりに`.poster-v2-act-meta`バーを構築して4列→3列(`showcase3`)へ変更していた。つまり`createCreditsPanel()`の出力は値を読み取るためだけに一瞬存在し、直後に丸ごと捨てられていた。

調査の結果、この2段階構造は「意図的なタイミング設計」ではなく、既存の`page.js`に触れずにUIリデザイン(PUBLIC DATA上部集約・3カラム化、commit `5754e9a`)を後付けした実装だったと判断した。実機検証では、初回描画時のチラつきは発生しない(ボードは`#cinematic-intro`より後の通常フロー位置にあり演出中はビューポート外、かつ変換は演出時間よりずっと速い約1フレームで完了する)一方、**ロスター切り替え時には約67msの間、実際に4列+creditsパネルが表示されてから3列+act-metaへ切り替わる既存のチラつきが発生していた**ことを確認した。

対応(完了、2026-09-21): `page.js`側で`createCreditsPanel()`の呼び出しをやめ、`createActMetaBar(model)`を新設して`.poster-v2-act-meta`バーとRULER/KEY STYLEの値を`model`から直接、最初から`poster-v2-grid--showcase3`の最終形で構築するようにした。`board-layout.js`は`polishAccess()`はもちろん、`polishBoard()`/`ensureActMeta()`を含めて一切変更していない(常に`.poster-v2-panel--credits`が存在しない状態で呼ばれるため恒久的にno-opとなるが、将来的なキャッシュ不整合時の安全網として意図的に残した)。目視確認: 修正前後でPlaywrightにより初回描画時・ロスター切り替え後それぞれの最終DOM(act-metaバーのHTML・grid class)が完全に一致することを確認し、**ロスター切り替え時の既存のチラつき(約67ms)は今回の変更で解消された**(悪化ではなく改善)。

**調査中に判明した既存の不具合(今回は対応しない)**: `js/act-showcase-scenario-writer.js`の`syncPosterCredit()`(最終ポスターのクレジットパネルへSCENARIO WRITER行を追加する機能)は、`board-layout.js`のcredits panel削除(rAF、約1フレーム)に対して、`scenario-writer.js`自身の非同期Supabase再取得が確実に間に合わないため、現状でも実質常に失敗している(実機検証で再現試行0/N件成功)。今回のcredits/act-meta統合により、対象要素(`.poster-v2-credit-table`)自体が構造的に存在しなくなるため、この既存の不具合は「タイミング次第で失敗」から「常に失敗」に変わるが、観測可能な挙動(SCENARIO WRITERがポスターのクレジットパネルに出ない)は変わらない。なお同じ`scenario-writer.js`の`syncTitleCredit()`/`syncSummaryCredit()`(タイトル画面・サマリー画面のSCENARIO WRITER表示)はcredits panelに依存しておらず、影響を受けない。対応は別途判断が必要: ①死んでいる`syncPosterCredit()`を削除する、②act-meta barにもSCENARIO WRITER表示を追加して機能を復活させる、のどちらにするかはユーザー判断待ち。

`js/act-showcase-neotokyo.js`の`showActTitle()`/`showSummary()`は、`model.heroSubTitle`を`getActOverview()`経由で読み、それぞれの画面に「ACT OVERVIEW // アクト概要」ラベルのボックス(`.neotokyo-sequence__act-overview` / `.neotokyo-sequence__overview-intro`)を追加していたが、`js/act-showcase-cinematic-enhancer.js`が毎回このボックスを構築直後に削除していた(`enhanceTitle()`/`enhanceScreen()`のsummary分岐)。ユーザー確認の上、この重複表示は不要と判断された。

調査の結果、`#opening-subtitle`(`#scene-opening`、CSSの`#opening-subtitle:before{content:"ACT OVERVIEW // アクト概要"}`、`act-showcase-neotokyo-hierarchy.css`)が既に同じラベル+同じ`model.heroSubTitle`テキストを表示していることを実機で確認した。加えて、調査中に**タイトル画面には別ルートの表示がもう一つ存在すること**が判明した: `js/act-showcase-cinematic-layout-v2.js`の`enhanceTitleScreen()`/`getMeaningfulSubtitle()`が、`#opening-subtitle`のテキストを直接読み取って`.neotokyo-sequence__act-subtitle`(ラベルなし)をタイトル画面に追加しており、これは`cinematic-enhancer.js`に削除されず現在も表示され続けている。つまりタイトル画面では、削除対象の`.neotokyo-sequence__act-overview`ボックスは(常に削除されるため)元から非表示、`.neotokyo-sequence__act-subtitle`が実際に表示されている側だった。サマリー画面には`.neotokyo-sequence__act-subtitle`に相当する別ルートは存在せず、`.neotokyo-sequence__overview-intro`も同様に常に削除されていたため元から非表示だった。

対応(完了、2026-09-22): `showActTitle()`から`getActOverview(model)`呼び出しと`.neotokyo-sequence__act-overview`ボックス構築を削除、`showSummary()`から`.neotokyo-sequence__overview-intro-label`/`.neotokyo-sequence__overview-intro`ボックス構築を削除。他で未使用になった`getActOverview()`/`DEFAULT_OVERVIEW`も削除した。`cinematic-enhancer.js`からは対応する2つの`querySelectorAll(...).forEach(node => node.remove())`(`enhanceTitle()`内、および`enhanceScreen()`のsummary分岐)を削除した(空になったsummary分岐の`if`ブロック自体も削除。`enhanceTitle()`のタイトルロゴ演出、`polishAccess()`等の他の処理には触れていない)。`js/act-showcase-cinematic-layout-v2.js`の`.neotokyo-sequence__act-subtitle`表示は今回のスコープ外として変更していない。目視確認: Playwrightで修正前・修正後それぞれ、タイトル画面・サマリー画面の最終DOM状態(ボックスの有無、サブタイトル文字列を含むか、`#opening-subtitle`のテキスト)を取得し完全一致することを確認した。

`js/act-showcase-neotokyo.js`の`showTrailer()`は、トレーラー画面に`.neotokyo-sequence__trailer-definition`(「ACT TRAILER」+「プレアクトで読み上げるトレーラー」)を追加していたが、同じ画面には既にeyebrow行(「03 // ACT TRAILER」)とsection-title見出し(トレーラータイトル)があり、ほぼ同趣旨の3つ目のラベルになっていた。`js/act-showcase-cinematic-layout-v2.js`の`simplifyTrailer()`が毎回この要素を構築直後に削除していた(もう1つの削除対象セレクタ`.cinematic-trailer-band`は、生成箇所がリポジトリ全体に存在しない死んだセレクタだったことも確認した)。

対応(完了、2026-09-22): 実機検証で、削除対象の内容(「ACT TRAILER」「プレアクトで読み上げるトレーラー」)がeyebrow(「03 // ACT TRAILER」)・micro行(「PRE-ACT READOUT / PUBLIC BROADCAST」)と重複していること、`.neotokyo-sequence__trailer-definition`は常に(paint前に同期的に)削除され元から非表示だったことを確認した。`showTrailer()`から`definition`要素の構築を削除し、`cinematic-layout-v2.js`の`simplifyTrailer()`関数と呼び出し元を削除した(`.cinematic-trailer-band`向けのCSSルールは触れていない、死んだセレクタのまま)。`attachTrailerFollow()`/`updateTrailerFrame()`(トレーラー自動スクロール追従)は変更していない。目視確認: Playwrightで修正前・修正後それぞれ、トレーラー画面の最終DOM状態(eyebrow/micro/section-title/readout/terminalの文字列)を取得し完全一致することを確認した。

### 今回のスコープ外として記録する重複・競合候補

今回の調査で見つかったが着手していないもの。次に着手する場合の候補として記録する。

- `js/act-showcase-board-layout.js`等7箇所(うち1件は上記のtrailer-definitionとして対応済み): 「本体が作ったものを削除して作り直す」パターンの重複。

## 12. Supabase画像変換への依存廃止・自前サムネイル生成への切替(完了)

### 背景

カード一覧の軽量化に使っていたSupabase Storageの画像変換API(`render/image`、`js/image-focus.js`の`toThumbnailUrl()`)は、ダッシュボード(Freeプラン)で「プランによっては利用できません」と表示される非サポート機能だった(この作業時点までは動作していたが、いつ止まってもおかしくない状態)。

対応: 自前で小さいWebPサムネイルを生成し、本体画像と同じフォルダへ`-thumb`付きで別途アップロードし、`characters.image_thumbnail_url`(新規列)に保存する方式へ切替。カード表示側は`image_thumbnail_url || image_url`でフォールバックする。

### 実装した内容

- `js/sheet-image.js`: 既存の`decodeImage`/`renderToCanvas`/`canvasToBlob`を再利用する`createThumbnail(file,{maxLongEdge=420,targetSize=40*1024})`を追加。`optimizeImage()`の圧縮済み`uploadFile`(最大1920px)を渡し、元画像の再デコードを避ける。
- `uploadImage()`: 本体画像アップロード後、`createThumbnail(uploadFile)`でサムネイルを生成し、同フォルダへ`-thumb`付きでアップロード。`characters.image_url`と`image_thumbnail_url`を同時に更新し、入れ替え前の本体・サムネイル両方を`removeOwnedStorageObject()`で削除。エラー時はサムネイル→本体の順にロールバック削除する。
- `clearImageReference()`: 本体画像と合わせてサムネイルも削除・列クリアする。
- `supabase/48_add_character_thumbnail_url.sql`(`characters.image_thumbnail_url text`、nullable)を追加し`migrations-manifest.json`にも追記した。2026-09-25に検証・本番共有のSupabaseプロジェクト(`koprmbkoftuuffslhsvt`)へ適用済み。
- `js/archive.js`・`js/showcase-generator-v3.js`(カード一覧3箇所: `createLibraryCard`のライブラリピッカー、`createArchiveSelection`の選択済みキャストプレビュー、`createOutputCastCard`の公開出力カード)を`character.image_thumbnail_url || character.image_url`のフォールバックへ変更。生成HTMLから公開データへ変換する`js/showcase-dynamic-publish-v3.js`は`createOutputCastCard`の画像URLをそのまま引き継ぐため、標準・NEO TOKYO両方の公開キャスト紹介も保存済みサムネイルを表示する。
- 2026-09-25に完全脱却を実施。未使用で残っていた`js/image-focus.js`の`toThumbnailUrl()`と変換URL生成用定数、変換専用テストを削除し、E2Eの通信許可も`/storage/v1/object/public/character-images/`だけに限定した。実行コードに`/storage/v1/render/image/`や`toThumbnailUrl`が再混入しない回帰テストを追加した。
- **migration未適用の間の安全対策**: `js/archive.js`のキャスト一覧取得、`js/sheet-image.js`の`loadCharacter()`はいずれも単発の`.select()`で、存在しない列を1つでも含めると`{error}`でSELECT全体が失敗する(検証・本番が同一Supabaseプロジェクトを共有しているため、影響は新機能が使えないだけでなく既存のアーカイブ一覧・画像編集画面そのものが丸ごとエラーになる)。`js/showcase-generator-v3.js`に既に実装されていた「列が存在しないエラー(`isMissingColumnError()`)を検知し、旧カラム構成のSELECTへ自動リトライする」パターンを、`js/archive.js`(`queryPublicCharacters()`)・`js/sheet-image.js`(`queryOwnedCharacter()`)にも同様に追加した(3ファイルとも同種のヘルパーを個別に持つ形になっており、共通化はしていない。次に着手する場合の候補として記録する)。

### 既知の制限として記録するもの

- **`js/sheet-mobile-image.js`はサムネイル生成自体には未対応**。バックフィル後にモバイルから画像を差し替え・解除した際、旧サムネイルが残って誤画像を表示しないよう、`image_thumbnail_url`を解除して旧サムネイルStorageオブジェクトも削除する。モバイルで差し替えた画像は、PCから再登録するか次回バックフィルまでフルサイズ画像へフォールバックする。次に着手する場合は、PC/Mobileの画像処理重複解消と合わせてサムネイル生成をモバイル側にも実装する。
- **`js/showcase-guests.js`は対象外**。ユーザー指示では直近PR対象ファイルとして名前が挙がっていたが、実際に調べるとゲスト画像は`characters`テーブルと無関係(別テーブル`act_showcase_guests`、別Storageアップロード経路、圧縮なし・最大1MB直接アップロード)であり、`image_thumbnail_url`列を持たない。`character.image_thumbnail_url || character.image_url`をそのまま当てはめると存在しないフィールドを参照する誤りになるため、今回は変更していない。ゲスト画像の軽量化が今後必要になった場合は、`characters`側とは別の対応(専用の`thumbnail_url`列を`act_showcase_guests`に追加する等)が必要。
- 2026-09-25に既存キャストを一括バックフィルした。全125件中、元画像がある108件について長辺最大420px・目標40KBのWebPを生成し、Storageオブジェクトと`image_thumbnail_url`の対応を108/108件確認した。元画像がない17件はサムネイルも空のまま。

## 13. 現在優先して守るべき資料

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
