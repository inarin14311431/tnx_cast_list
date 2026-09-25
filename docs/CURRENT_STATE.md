# 現在地 / Current State

最終更新: 2026-09-25

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
