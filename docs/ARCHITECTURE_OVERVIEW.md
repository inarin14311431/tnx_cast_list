# アーキテクチャ概要

最終更新: 2026-09-17

この文書は、TNX CAST ARCHIVEの全体構成と責務境界を把握するための上位資料である。詳細仕様は各領域資料を参照する。

## 1. 全体構成

TNX CAST ARCHIVEは、静的HTML + JavaScript ES Modules + Supabaseを中心に構成されるWebアプリケーションである。

大きく分けて以下の層を持つ。

```text
HTML pages
  ↓
Page / UI adapters
  ↓
Shared domain logic / normalization / projection
  ↓
Persistence / Supabase client / RPC
  ↓
Supabase tables / RLS / Edge Functions
```

CSSは `css-next/` のentry + cascade layer + theme manifestで管理する。

## 2. 主な画面

### 公開・閲覧

- `index.html` — 公開キャスト一覧
- `cast.html` — キャスト閲覧
- `troops.html` / `troop.html` — トループ一覧・詳細
- `act-showcase.html` / `act-showcase-standard.html` — アクト紹介
- `statistics.html` — 統計

### 認証・管理

- `login.html`
- `register.html`
- `password-reset.html`
- `account.html` — ユーザー管理キャスト等の入口

### 編集

- `sheet.html` — PC編集
- `sheet-mobile.html` — Mobile編集
- `sheet-mobile-new.html` — Mobile新規作成導線
- `showcase-generator.html` — アクト紹介生成

### 補助

- `transfer.html` / `mobile-transfer.html`
- `backup.html`
- `manual-data-import.html`

## 3. PC editor

PC編集の中心は `sheet.html` と `js/sheet.js`。

`sheet.js` は全責務を抱える単一巨大moduleではなく、次のshared modulesへ処理を委譲する方向で整理されている。

代表例:

- `sheet-save-coordinator.js` — PC保存state machine
- `sheet-save-payload.js` — 保存payload projection
- `sheet-save-persistence.js` — 永続化
- `sheet-load-persistence.js` — 読込
- `sheet-load-normalization.js` — 読込正規化
- `sheet-new-character-state.js` — 新規キャスト初期値
- `sheet-row-factory.js` — row生成
- `sheet-row-collection-state.js` — collection操作
- `sheet-character-input-snapshot.js` — character入力projection
- `sheet-ability-*.js` — 能力値関連pure logic / snapshot
- `sheet-style-*.js` — style関連pure logic / presentation
- `sheet-skill-*.js` — skill関連state / rendering

UI拡張は `ui-v25.js`、`sheet-features.js`、`sheet-sidebar-actions.js` 等に分かれている。

設計上、PC固有DOMとshared business logicを分離する。

## 4. Mobile editor

Mobile編集のentryは `sheet-mobile.html` → `sheet-mobile-app.js`。

`sheet-mobile-app.js` はMobile用modulesをimportして構成する。

代表例:

- `sheet-mobile-runtime.js` — auth + Mobile editor context
- `sheet-mobile-save-coordinator.js` — Mobile固有のsave event aggregation
- `sheet-mobile-profile.js`
- `sheet-mobile-style.js`
- `sheet-mobile-ability.js`
- `sheet-mobile-skills.js`
- `sheet-mobile-outfit.js`
- `sheet-mobile-combos.js`
- `sheet-mobile-snapshots.js`
- `sheet-mobile-image.js`

MobileはPCと同じDOMを再利用するのではなく、Mobile UI adapterとして独立させる。

一方、業務ルールは可能な限りshared moduleを使う。

現行例:

- `sheet-mobile-new-character-state.js` → `sheet-new-character-state.js` を利用
- `sheet-mobile-new-character-state.js` → `sheet-save-payload.js` を利用

つまり「画面は別、ルールは共有」が基本形である。

## 5. Shared domain layer

shared layerに置くべきものはDOMを必要としない処理である。

主な種類:

- 初期値
- normalizer
- save/load projection
- rule calculation
- collection state
- external data adapter
- pure validation

この層はNode testで直接検査できる形を優先する。

### 共通化判断

PC/Mobileのファイル名が似ていても、以下の順で判断する。

1. 入出力が同じか
2. DOMに依存していないか
3. UI message/focus/button stateを含んでいないか
4. DB操作だけ切り出せないか
5. 既存shared moduleが既にないか

## 6. Persistence / Supabase

ブラウザ側Supabase entryは `js/supabase-client.js`。

永続化処理は、可能な限りUIから分離したmoduleやRPCを介す。

Security上の重要な前提:

- service-role credentialはBrowserへ置かない。
- owner scope / RLSを前提にする。
- privileged editor機能はcapability RPCでgateする。
- administrative operationはEdge Function等のserver-side境界を使う。

Security invariantは `scripts/audit-security.mjs` で静的確認する。

## 7. Database migration

DB履歴は `supabase/migrations-manifest.json` をrepository側の順序契約として扱う。

- 適用済みmigrationはimmutable。
- corrective changeは新規migration。
- manifestはlive deployment ledgerではない。
- live DB状態は別途確認する。

詳細: `docs/DATABASE_MIGRATIONS.md`

## 8. Outfit data model

`character_outfits` はトップレベル列 + `ofc_details` JSONのハイブリッドである。

画面ごとに独自優先順位を実装せず、normalization boundaryで論理モデルへ寄せる。

特に正規値の所在を変更すると、PC編集、Mobile編集、閲覧、OFC補完、JSONP比較、転記へ連鎖する。

詳細: `docs/OUTFIT_DATA_ARCHITECTURE.md`

## 9. External / compatibility boundaries

外部形式やlegacy形式はadapter/normalizerで内部形式へ変換する。

例:

- キャラクターシート倉庫 JSONP
- OFC master data
- SKD master data
- legacy backup/import

外部キーを内部DB schemaへそのまま増殖させない。

## 10. Navigation context

編集画面間では `return` queryを使って親画面への戻り先を維持する処理がある。

現状、PC、Mobile、`mobile-editor-route.js` に類似処理が存在する。

今後共通化する場合は、以下だけをpure coreへ出す方針が安全。

- allowed return page判定
- same-origin validation
- URL parse
- local href生成
- public ID取得などの小さいURL utility

DOM更新やPC/Mobile固有リンク生成は各adapterに残す。

## 11. Snapshot

PC/Mobile双方にSnapshot UIがあり、Supabase CRUD/RPCに重複がある。

将来の共通化候補:

- list
- create
- restore
- delete
- bundle snapshot RPC wrapper

ただしdirty判定、confirm、message、DOM renderはUI側に残す。

## 12. CSS architecture

テーマ対応pageは原則:

1. page/application entry stylesheet
2. `css-next/themes/index.css` を最後

`css-next/index.css` はcommon foundationのみ。

ownership:

- `tokens/`
- `foundation/`
- `layout/`
- `components/`
- `editor/`
- `pages/`
- `themes/`

詳細: `docs/CSS_ARCHITECTURE.md`

## 13. Theme architecture

Source of truth:

- Theme registry: `js/theme-registry.js`
- Theme CSS manifest: `css-next/themes/index.css`
- semantic scope mapping: `js/theme-scope.js`
- selection/persistence: `js/css-next-theme.js`

concrete `data-theme` selectorをpage CSSへ書かない。

詳細: `docs/THEME_SYSTEM.md`

## 14. Test architecture

テストも責務分離する。

```text
static audit       -> 構造、禁止事項、ownership、依存関係
Node test          -> pure logic / contract / regression
Playwright E2E     -> ユーザー操作と画面間連携
Visual Regression -> 見た目
Quality            -> accessibility / performance
Security audit     -> security invariant
live-write E2E     -> 実DB保存/復元（明示実行のみ）
```

この分類は設計方針であり、2026-09-17時点でmanifestを使った分類runnerは検証repoにのみ導入済み。本番の既存CIには保存・原状復帰テストが含まれる。runtimeが同期済みでも、npm scriptsやCIの実行対象が同じとは限らない。

詳細: `docs/TESTING_STRATEGY.md` 第6節（環境差を含む）。

## 15. Architecture変更のルール

以下を変更したPRは、本資料または対応する詳細資料も更新する。

- module ownership
- shared / PC / Mobile境界
- canonical data source
- DB persistence boundary
- CSS ownership
- Theme source of truth
- test layerの責務
