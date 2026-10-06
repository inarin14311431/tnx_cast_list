# ACT SHOWCASE 層構造マップ

調査のみ(コード変更なし)。基準: main `becb0ea`。集計はスクリプト(postcss / 正規表現)で機械的に出した。
「未確認」= 推測または未検証。関連: `docs/archive/CURRENT_STATE_20260925.md` 第11節(完了済みの整理と、失敗した試行)。

## 0. 要点

- 豪華版 `act-showcase.html` = CSS 6ファイル(下記の順に `<link rel="stylesheet">` で直接読む。`@import` なし、レイヤー指定なし)。元は29本を `act-showcase-entry.css` が `@import` していたが、カスケード順を変えずに隣り合うファイルだけを連結して6本にした。以下の章で `act-showcase-xxx.css` と書いているファイルは、現在は下記バンドルの中に `/* ==== from: 元ファイル名 ==== */` 境界コメント付きで入っている(宣言の削除・並べ替え・セレクタの書き換えはまだしていない)+ JS 21本(bootstrap から `await import` 連鎖)。
- 豪華版のCSS読み込み順(`act-showcase.html`):
  1. `act-showcase-core.css` = 元の1〜12番目(`act-showcase.css` 〜 `act-showcase-layout-polish.css`)
  2. `act-showcase-scenes.css` = 元の13〜24番目(`act-showcase-story-flow.css` 〜 `act-showcase-handout-live-frame.css`)
  3. `act-showcase-theme-surface-system.css`(スタンダード版・ダウンロード出力と共有)
  4. `act-showcase-theme-phase-contract.css`
  5. `act-showcase-theme-legibility.css`(スタンダード版・ダウンロード出力と共有)
  6. `act-showcase-theme-scenes.css` = 元の28〜29番目(`act-showcase-theme-scene-contract.css`、`act-showcase-visual-emphasis.css`)
  順序は `scripts/audit-act-showcase-architecture.mjs` が元29ファイルの順まで検査する。契約テストは `tests/helpers/act-showcase-css.mjs` で、バンドルから元ファイル単位の本文と順序を取り出して読む。
- スタンダード版 `act-showcase-standard.html` = CSS 5本 + JS 7本。同じ5本のCSSは `js/showcase-dedicated-output.js` がダウンロード用HTMLにも埋め込む。
- 同一(@コンテキスト+セレクタ+プロパティ)の重複: **204キー / 234件の追加定義**(厳密)。接頭辞(`body…`・`.cinematic-intro.neotokyo-sequence`)を除いて数えると **335キー / 389件**(緩い)。
- そのうち「後段が同一キーを再定義していて確実に死んでいる宣言」は調査時 **237個 ≒ 11.4KB**(全体348KBの3%)。**#487 で187キー(165宣言、11,162B)を削除済み**。残り50キー: スタンダード版で生きている theme-legibility 30、`!important`・同一ファイル内再定義 3、セレクタ群の一部のみ上書き17(うち8キーは統合後の theme-surface-system 内)。削減の大半は死んだ宣言ではなく、セレクタ違いの上書きの整理になる。
- 視覚テスト(`visual-regression-baseline` ブランチ)は豪華版・スタンダード版・ACT用4テーマを**1枚も撮っていない**。統合前に最優先で補う。

## 1. CSS の層(豪華版、`@import` 順)

列: `厳密 前/後` = 同一キーを前の層から上書き/後の層に上書きされる数。`緩い 前/後` は接頭辞を除いた数。
種別: 新規 = 前の層の上書きが無視できる(緩い前 < 5%)。

| # | ファイル | KB | 役割 | 種別 | 上書き先(緩い前の主要) | 厳密 前/後 | 緩い 前/後 | 単独 |
|---|---|---|---|---|---|---|---|---|
| 1 | act-showcase | 20.8 | 旧ベース(:root変数・リセット・opening・cast) | 新規 | - | 0/0 | 0/39 | - |
| 2 | poster-v2 | 15.2 | poster board 本体(`.poster-v2-*`) | 新規 | act-showcase 32 | 0/60 | 32/69 | - |
| 3 | cast-selector | 1.1 | roster item の button 化 | 新規 | - | 0/0 | 0/0 | ○ |
| 4 | neotokyo | 17.2 | NeoTokyo 導入シーケンス基底 | 新規 | - | 0/0 | 1/20 | - |
| 5 | neotokyo-linked | 12.2 | 担当割当(linked)画面 | 新規 | - | 0/0 | 0/0 | ○ |
| 6 | neotokyo-hierarchy | 5.8 | タイトル/概要の階層、loading非表示 | 新規 | - | 0/1 | 0/7 | - |
| 7 | cinematic | 10.4 | NeoTokyo shell 背景・isolation | 新規寄り | neotokyo 8, hierarchy 3 | 0/0 | 11/4 | - |
| 8 | ornament | 8.2 | poster 専用アートディレクション | **上書き** | poster-v2 44 | 44/3 | 50/8 | - |
| 9 | ornament-plus | 14.5 | PC≥1100px の高密度 poster | 新規 | - | 0/0 | 0/0 | ○ |
| 10 | finale | 17.3 | タイトルロゴ+最終ブリーフィング | 新規 | - | 0/1 | 3/4 | - |
| 11 | cinematic-readability | 8.0 | 可読性・アクセス操作 | 新規寄り | neotokyo 5 | 2/5 | 8/27 | - |
| 12 | layout-polish | 12.8 | 最終レイアウト調整 | **上書き** | cinematic-readability 26 | 5/2 | 33/2 | - |
| 13 | story-flow | 15.4 | trailer→handout→assign→ready の流れ | 新規 | - | 2/3 | 2/33 | - |
| 14 | writing-patterns | 5.8 | ハンドアウト書式 | 新規 | - | 0/15 | 2/18 | - |
| 15 | supporting-cast | 8.9 | 主役タイトル・割当スタイル・サポートキャスト | 新規寄り | writing-patterns 3, story-flow 3 | 4/0 | 7/37 | - |
| 16 | presentation-tuning | 3.7 | 表示chromeの安定化 | **上書き** | supporting-cast 23 | 2/2 | 26/2 | - |
| 17 | visual-trailer-fix | 1.6 | trailer枠を文書フロー化、visual名のcode風 | 新規(小) | story-flow 4 | 0/5 | 4/5 | - |
| 18 | title-cyberpunk | 6.3 | タイトルロックアップ+visual caption | 上書き(小) | supporting-cast 4 | 4/0 | 9/0 | - |
| 19 | cinematic-v2 | 11.9 | 「最終」上書き(nav非表示・タイトル等) | **上書き** | story-flow 25, poster-v2 24, writing-patterns 11 | 33/0 | 76/0 | - |
| 20 | cinematic-fit | 1.5 | `data-fit` による文字フィット | 新規 | - | 0/0 | 0/0 | ○ |
| 21 | top-background-only | 0.4 | ACT背景はヒーローのみ | 新規 | - | 0/0 | 0/2 | - |
| 22 | followup-v1 | 5.7 | フォローアップ修正 | 上書き(小) | supporting-cast 10, top-background-only 2 | 1/0 | 13/0 | - |
| 23 | final-trailer | 6.4 | 最終ボード上部の `.poster-v2-trailer-stage` | 新規 | - | 0/0 | 0/0 | ○ |
| 24 | handout-live-frame | 1.7 | handout 読み上げ中のstage overflow所有 | 新規 | - | 0/0 | 0/0 | ○ |
| 25 | theme-surface-system(旧 dedicated-themes を先頭に統合、**済**) | 56.6 | 4テーマのパレット変数と基本面(先頭)+ 面の色の所有(後半) | 新規 | - | 0/0 | 0/0 | - |
| 27 | theme-phase-contract | 24.8 | 旧cinematicセレクタのテーマ化(title/trailer/handout/assign/summary/finale) | 新規 | - | 0/92 | 0/92 | - |
| 28 | theme-legibility | 20.3 | 可読面の保証 | **上書き** | phase-contract 52 | 52/30 | 52/30 | - |
| 29 | theme-scene-contract | 20.0 | 旧シーン部品にテーマを反映 | **上書き** | phase-contract 38, legibility 30 | 68/0 | 68/0 | - |
| 30 | visual-emphasis | 8.8 | 強調アクセントの復元 | 新規(小) | phase-contract 2 | 2/0 | 2/0 | - |

- 単独成立(4指標すべて0): cast-selector / neotokyo-linked / ornament-plus / cinematic-fit / final-trailer / handout-live-frame。ただしセレクタが違う要素への干渉(特異度戦)は測っていない = **未確認**。
- `!important` は30ファイルに0件。優先度は `body#act-showcase-page` 等のセレクタ接頭辞で取っている。
- `docs/CSS_ARCHITECTURE.md` は「entry が named cascade layer で import」と定めるが、豪華版のCSS(旧 `act-showcase-entry.css`、現在は6ファイルの直接 `<link`)は `layer()` を使っていない(`audit:css` が通っている理由は未確認)。

### 1.1 重複定義(ファイルの組ごと、上位)

| 組 | 厳密 | 緩い | 値が同一(厳密) |
|---|---|---|---|
| theme-phase-contract ↔ theme-legibility | 52 | 52 | 9 |
| ~~dedicated-themes ↔ theme-surface-system~~(統合済み。#487 で同値の宣言を除去、残りは1ファイル内) | 0 | 0 | - |
| poster-v2 ↔ ornament | 44 | 44 | 3 |
| theme-phase-contract ↔ theme-scene-contract | 38 | 38 | 3 |
| theme-legibility ↔ theme-scene-contract | 30 | 30 | 3 |
| act-showcase ↔ poster-v2 | 0 | 32 | 4(緩い) |
| cinematic-readability ↔ layout-polish | 5 | 26 | 3 / 9 |
| story-flow ↔ cinematic-v2 | 0 | 25 | 4(緩い) |
| poster-v2 ↔ cinematic-v2 | 15 | 24 | 1 |
| supporting-cast ↔ presentation-tuning | 0 | 23 | 1(緩い) |
| writing-patterns ↔ cinematic-v2 | 11 | 11 | 0 |
| supporting-cast ↔ followup-v1 | 0 | 10 | 1(緩い) |
| neotokyo ↔ cinematic | 0 | 8 | 3(緩い) |
| ornament ↔ cinematic-v2 | 2 | 7 | 0 |

残りの組は各6件以下(全組の一覧は集計スクリプトで再生成できる。`postcss` で `@コンテキスト|セレクタ|プロパティ` をキーに集計)。
スタンダード版の4本(統合後)に残る重複は、統合した theme-surface-system 内のセレクタ群の一部のみ上書き8キーだけ。

### 1.2 確実に死んでいる宣言(後段が同一キーを再定義)

調査時の数値。#487 で187キー(165宣言、11,162B)を削除済み。theme-legibility の30は、スタンダード版が scene-contract を読まないため残している。

| ファイル | 個数 | ≒バイト |
|---|---|---|
| theme-phase-contract | 65 | 4,699 |
| dedicated-themes | 45 | 2,316 |
| theme-legibility | 30 | 1,790 |
| poster-v2 | 58 | 1,499 |
| writing-patterns | 15 | 377 |
| presentation-tuning | 2 | 214 |
| cinematic-readability | 5 | 135 |
| story-flow / visual-trailer-fix / layout-polish / ornament / finale / surface-system / hierarchy | 計 17 | 約 300 |
| **合計** | **237** | **≒11,400** |

### 1.3 前の層に吸収できる候補

| 候補 | 根拠 | 注意 |
|---|---|---|
| ~~dedicated-themes → surface-system(隣接)~~ **済(統合)** | 45キー重複(#487 で38キー除去、残りは統合後のファイル内) | 統合時、同一セレクタのルール11組を併合(audit:css の重複セレクタ禁止のため) |
| ornament → poster-v2 | 44キーを上書き(同値3 = ほぼ実質的な上書き) | 値を畳み込む作業が必要 |
| layout-polish → cinematic-readability(隣接) | 緩い26 | 同上 |
| presentation-tuning → supporting-cast | 緩い23 | 間に挟まる層なし(隣接) |
| cinematic-v2 → story-flow / poster-v2 / writing-patterns | 緩い76 | 影響範囲が広い |
| theme 3本(phase / legibility / scene) | 相互に52+38+30 | 豪華版のみ。最もリスクが高い |
| 小ファイルの連結(20〜24、16〜18) | 並びを変えずに連結 = カスケード不変 | バイト削減はほぼ無し。@import の連鎖が減る |

## 2. テーマ CSS 5ファイル

| ファイル | 何を決めるか | スタンダード | 豪華版 |
|---|---|---|---|
| theme-surface-system 前半(旧 dedicated-themes、22.6KB) | `data-showcase-theme` ごとのパレット変数(`--showcase-primary-rgb` 等)と基本面。定義源は本ファイルのみ | ○ | ○ |
| theme-surface-system 後半(36.0KB) | 面(surface)の色・境界・影。変数 `--showcase-surface-*` と各部品への適用 | ○ | ○ |
| theme-phase-contract (24.8KB) | 旧cinematicセレクタと同じ特異度で、title/trailer/handout/assign/summary/finale をテーマ化 | - | ○ |
| theme-legibility | 可読面の保証(`--showcase-readable-*`)。テーマの個性は変えない。**コントラスト修復(WCAG AA)もここ**: テキスト用トークン `--showcase-readable-accent` / `-accent-2`(そのテーマの面の上のラベル色)と `--showcase-on-dark-text` / `-muted` / `-accent` / `-accent-2`(どのテーマでも暗いままの板: ロースターのカード・visual caption・フッター用)を定義し、旧い暗いパレット前提の固定色をこの変数に付け替える。dark テーマは4.5:1未満だった箇所だけ、intron(明るい)は全体。検査は E2E `act-showcase-contrast` | ○ | ○ |
| theme-scene-contract (20.0KB) | 旧シーン部品が旧cyan/pinkパレットを使わないように反映(`--showcase-scene-*`)。intron は `--showcase-scene-accent-2` / `-3` を readable-accent 系の濃色にして、灰白のプレート上のラベルが4.5:1に届くようにしている | - | ○ |

- 上書き関係: 前半(dedicated)→ 後半(surface)は統合済み(1ファイル、ルール併合後も有効宣言は不変)/ phase → legibility(52) → scene(30)、phase → scene(38)。順序は legibility が phase の後、scene が legibility の後(コメントの「Loaded last」「final」が3ファイルとも主張していて矛盾)。
- 差: スタンダード版は phase-contract / scene-contract(計44.8KB)と visual-emphasis を読まない。テーマIDは nova / intron / vlad / lutetia(保存IDは互換のため旧名、`act-showcase-theme-runtime.js` が `<html data-showcase-theme>` を設定、スタンダード版では classic script、豪華版では bootstrap が `import`)。
- スタンダード版は legibility を読むが phase / scene は読まない → スタンダードで効いている上書きの組は、統合した theme-surface-system 内の8キーのみ。
- 3ファイルの順序依存は `tests/showcase-theme-phase-contract.test.mjs` `showcase-theme-surface-system.test.mjs` `showcase-cinematic-theme-coverage.test.mjs` がCSS文字列を固定(値まで見ているかは未確認)。

## 3. JS の層

### 3.1 豪華版の読み込み順(bootstrap、すべて `await import` で逐次)

| 順 | ファイル | 行 | MO | 備考 |
|---|---|---|---|---|
| 1 | act-showcase-theme-runtime | 49 | - | `data-showcase-theme` 設定 |
| 2 | cinematic-enhancer | 122 | ○ | |
| 3 | summary-advance-guard | 11 | - | |
| 4 | finale-enhancer | 134 | ○ | |
| 5 | cinematic-polish | 107 | ○ | |
| 6 | board-layout | 113 | ○ | |
| 7 | story-flow | 246 | ○ | |
| 8 | writing-patterns | 214 | ○ | |
| 9 | cinematic-layout-v2 | 216 | ○ | |
| 10 | handout-live-frame | 194 | ○ | |
| **11** | **act-showcase-page**(本体) → image-focus / act-showcase-visual-caption(文言規則の純粋関数) / act-showcase-neotokyo(563行) / public-showcase-service | | | DOMを生成。**1〜10 の observer は本体より先に登録済み** |
| 12 | scenario-writer | 116 | ○ | 本体の後 |
| 13 | supporting-cast | 241 | ○ | 本体の後 |
| 14 | final-trailer | 103 | ○ | 本体の後 |
| 15 | display-normalizer → showcase-display-format | 51 | ○ | スタンダードと共用 |

bootstrap から到達するのは22ファイル(visual-caption-code を削除し、共通の純粋関数 `act-showcase-visual-caption.js` を追加。その後 ACT TRAILER の枠の補間の純粋関数 `act-showcase-trailer-settle.js` を追加。cinematic-layout-v2 が import する)。`act-showcase*.js` + `showcase*.js` は50ファイル、うち MutationObserver 使用は20(豪華版12 + ジェネレーター8)。

### 3.2 MutationObserver 20ファイル(何を監視し何を書き換えるか)

豪華版(12、bootstrap 順):

| ファイル | 監視 | 書き換え |
|---|---|---|
| cinematic-enhancer | `#cinematic-intro` childList/subtree/characterData | access-seal追加(アクセス画面の見出し3行は neotokyo.js が最初から最終文言で出す)、trailerをterminal化(キャスト名の引用符正規化は手順5cで削除。名前は読み込み時点で正規化済み) |
| finale-enhancer | intro(同上) | タイトルロゴ構造(meta/ghost/rule)と `dataset.fit`、最終ブリーフィング構造、body class `showcase-neotokyo-title-logo-active` / `-finale-active` |
| cinematic-polish | pageRoot+intro(characterData含む)/ intro | rAF で `data-fit`・`nameFit`、ACT ENTRY ボタンをフッターに追加 |
| board-layout | `#showcase-story` と intro | act-metaバー、`polishAccess` マーカー。credits パネルの取得・削除経路は削除済み(手順4) |
| story-flow | intro(class 属性) | link-bridge、ROLEセル、assigned-route、trailer outro、サマリーのスタイルを `replaceChildren`、entry-vectors |
| writing-patterns | intro(class)+ readout(characterData) | ハンドアウト解析、context cells を `replaceChildren`、assigned-route の文言 |
| cinematic-layout-v2 | intro(childList のみ。**characterData は監視しない**) | タイトル副題要素(`#opening-subtitle` から)。ACT TRAILER の枠の高さ・追従スクロール(読み上げ中は rAF ループ1本。`data-typing` の間だけ) |
| handout-live-frame | intro(+ readout に ResizeObserver) | handout読み上げ中のstage高さ/スクロール追従 |
| scenario-writer | `document.body` childList/subtree | 開始/タイトル/サマリーに SCENARIO WRITER 行を追加 |
| supporting-cast | `document.body` childList/subtree | ゲストを取得し、role修正、サマリーのスタイルを `replaceChildren`、poster の role chip 強調 |
| final-trailer | `document.documentElement` childList/subtree | 最終ボード上部に `#poster-final-act-trailer` を生成して挿入 |
| display-normalizer | `document.body` childList/subtree | タグライン(`formatShowcaseTagline`)の正規化のみ(名前側の `NAME_SELECTORS` は手順5cで削除) |

ジェネレーター(8、豪華版・スタンダード版では読まれない。ジェネレーター画面用):

| ファイル | 監視対象 | 概要(関数名・監視対象からの推定 = 未確認) |
|---|---|---|
| showcase-cast-pagination | 選択キャストのgrid childList | キャストのページ送り |
| showcase-dynamic-publish-v3 | 旧公開ボタンの属性 | 公開ボタンの同期 |
| showcase-guests | プレビュー iframe の `srcdoc` | ゲスト行のプレビュー同期 |
| showcase-handle-normalizer | `document.body` | ハンドル引用符の正規化 |
| showcase-output-normalizer | プレビュー `srcdoc` | プレビューのソース正規化 |
| showcase-owned-list | 所有アクトの `<select>` | 一覧の再構築 |
| showcase-publish-url-canonicalizer | ステータス要素の href | 公開URLの正規化 |
| showcase-tagline | 選択キャスト一覧 | タグライン自動入力 |

### 3.3 「本体が作ったDOMを後段が消す/作り直す/上書きする」箇所

`CURRENT_STATE.md` 第4節の「7箇所」のうち、第11節で解消したものを除く現状。

| 箇所 | 作る側 | 書き換える側 | 状態 |
|---|---|---|---|
| アクセス画面の見出し3行 | act-showcase-neotokyo(最終文言で生成) | - | **解消済み(手順5b)**。cinematic-enhancer `enhanceAccess` の文言上書きを削除(is-cinematic-access と access-seal は残す)。E2E `act-showcase-final-copy` が書き換え前文言の不在を検査 |
| `NODE // TOKYO N◎VA` ラベル | act-showcase-neotokyo(最終文言で生成) | - | **解消済み(手順5b)**。cinematic-layout-v2 `normalizeNodeLabel` を削除 |
| 読み込み画面・進捗ラベルの文言 | act-showcase-neotokyo(`prepareNeoTokyoLoading` / `showOpening`) | - | **文言を統一(手順5c-A)**。旧 `SYSTEM ACCESS` と日本語sub を `ACT FILE // ACCESS` / `CONNECTING TO PUBLIC ACT FILE…` / 進捗 `ACT FILE ACCESS // 05%` に変更(表示が変わる意図した変更)。E2E `act-showcase-final-copy` が旧文言の不在を検査 |
| 読み込み画面とアクセス画面の見出し・小見出し・サブの書体 | 読み込み画面 `.cinematic-intro__*`(act-showcase.css)→ アクセス画面 `.is-cinematic-access .neotokyo-sequence__*`(act-showcase-cinematic.css) | - | **指定を一致(手順5c後の修正B)**。書体・太さ・字間・サイズ・位置(アクセス画面は下に boot log と seal が積まれるぶん上にあるので 7.6rem 上げる)を揃え、切り替わる瞬間に文字の形が変わらないようにした。E2E `act-showcase-final-copy` が3画面幅で一致を検査。フォントは Google Fonts を `display=block` にして、代替書体で出てから Orbitron に差し替わらないようにした | 中央の横線(`.cinematic-intro:before`)はサブ行に背景色(`--showcase-bg`)を持たせて背後で切り、サブの打ち消し線に見えないようにした(追加修正)。
| `act-showcase.html` の初期表示の文言(読み込み画面の3行・状態行) | HTML(スクリプトが出す最終文言と同じ。`act-showcase-initial-copy.test.mjs` が一致を検査) | act-showcase-neotokyo `prepareNeoTokyoLoading`(同じ文言を再設定するだけ) | **解消済み(初期文言の修正)**。旧 `ACT SHOWCASE` / `PUBLIC ARCHIVE ACCESS` / `アクト紹介を読み込み中…` は HTML から削除。状態行は読み込み画面と重複するので空にした(エラー時の表示先として残す)。E2E `act-showcase-final-copy` が初期HTMLの時点から旧文言が一度も出ないことを検査 |
| ACT TRAILER の読み上げ本文 | act-showcase-neotokyo(最初から全文を、読み上げ済み `.neotokyo-sequence__readout-read` と未読み上げ `...-unread`(`visibility:hidden`、`aria-hidden`)の2つの span に分けて置く) | cinematic-layout-v2(枠の高さとスクロール) | **解消済み(トレーラーのガタつき)**。従来は textContent を読み上げ済みの部分だけに置き換えていたため、枠が行ごとに階段状に伸び、折り返しも途中で変わり、ResizeObserver の追従スクロールと重なって揺れた。ハンドアウト側は別の仕組み(下記)で、今回は未変更 |
| 代替画像(scan-failed.webp)の文字 | 各画面の `img`(neotokyo.js / page.js) | cinematic-fit.css | **枠の幅から画像の大きさを決める(修正D1)**。800x800の画像の文字は幅の約45%なので、枠幅の190%で中央に置けば文字が必ず枠内に収まる(切れるのは文字のない余白)。割当・サマリー・最終ボードに適用。E2E `act-showcase-clipping` |
| サマリーのキャスト名 / 識別コード行 | neotokyo.js / page.js | cinematic-fit.css | **折り返す(修正D2・D3)**。以前は `white-space:nowrap; text-overflow:ellipsis` で「…」になっていた(識別コードの右端切れも同じ。意図的なフェードではない) |
| 割当画面の右上の空の枠 | theme-surface-system `.neotokyo-sequence__cast-detail:before` | - | **削除(修正D4)**。名前用プレートが、名前が下に移った後も上部に残っていた(中身なし)。全テーマで出ていた |
| poster の visual caption | act-showcase-page(最終形で生成。文言規則は act-showcase-visual-caption.js) | - | **解消済み(手順5a)**。担当スタイル・所属・公開名から1回で組み立て、以後だれも書き換えない。supporting-cast とは role/style の判定関数を共有。`visual-caption-code` は削除 | 最終ボード上部の KEY STYLE は `buildKeyStyle(casts)`(同ファイル)で各キャストの担当スタイルをPC順に ` × ` でつなぐ(◎● なし、担当なしのキャストは飛ばし、全員なしは `—`、同じ担当はまとめない、件数上限なし。6人で長いスタイル名でも、セル内で折り返して枠からはみ出さない=`act-showcase-key-style` E2E)。`act-showcase-board-layout.js` の `ensureActMeta` の `—` は本体が先に作るための安全網で、この値は出せない。
| サマリーの style 行 | act-showcase-neotokyo | story-flow `replaceChildren` → supporting-cast `replaceChildren`(2段) | 現存 |
| handout の context cells | story-flow(ROLEセル) | writing-patterns `replaceChildren` | 現存(story-flow は枠だけ作る設計に整理済み) |
| ROLE スロット/チップ | act-showcase-neotokyo / page | supporting-cast `repairNeoTokyoRoles` / `emphasizePosterRoles` | 現存 |
| キャスト名の引用符 | showcase-display-format `normalizeShowcaseDisplayQuotes`(規則はここに1つだけ) | - | **解消済み(手順5c)**。名前はデータを読む時点で正規化し、DOMは正規化済みの値から作る: 豪華版 `createShowcaseModel`(cast の `fullName`/`reading`)、スタンダード版 `act-showcase-standard.js`(同)、ゲストは行を読む時点で `displayName`(豪華版 `supporting-cast`、スタンダード版 `standard-guests`)。cinematic-enhancer `normalizeVisibleQuotes`/`normalizeDuplicateHandleQuotes` と display-normalizer の名前側を削除。3つの旧関数は前後空白の trim 以外は同一の結果で、その差はどの経路でも既に trim 済みの値しか来ないため表示に影響しなかった。スタンダード版のナビ/alt は以前は重複引用符のまま出ていたが、いまは正規化済み。単体テスト `showcase-name-normalization`、E2E `act-showcase-name-quotes` |
| credits パネルの削除 | - | board-layout `credits.remove()` | **削除済み(手順4)**。生成経路なし(page.js の `createCastGrid` は常に `poster-v2-grid--showcase3`。`createCreditsPanel` は cd8ca299 で除去) |
| poster クレジット行 | - | scenario-writer `syncPosterCredit` | **削除済み(手順4)**。`.poster-v2-credit-table` を生成する経路なし。最終ボードへの SCENARIO WRITER 表示の復活は未実施 |

### 3.4 描画順・タイミングに依存する箇所(統合で壊れやすい。根拠のE2E/テスト付き)

| 箇所 | 依存 | 根拠 |
|---|---|---|
| タイトル画面の最初の可視フレームで装飾・子要素順が確定(meta < ghost < title < subtitle < rule < ruler) | finale-enhancer が自前 observer 内で**同期**に `dataset.fit` とロゴ構造を設定。rAF に寄せると1フレーム遅れる | `tests/e2e/act-showcase-title-render-order.spec.js`、第11節の失敗記録 |
| 公開背景が最初のフレームから出る | top-background-only / followup-v1 CSS と page の順序 | `act-showcase-neotokyo-stability.spec.js` 2本目 |
| ACT TRAILER の枠の伸びと追従スクロール | cinematic-layout-v2 `startTrailerLoop` / `updateTrailerFrame`(枠の高さ=キャレット行の下端を `settleHeight` で補間。1フレームの上限 maxStep は枠の遅れが「1行+下余白」以内のときだけ働き、超えた分はそのフレームで詰める=読み上げ行が枠の下に隠れない。スクロールは同じ補間後の値から1本)+ act-showcase-trailer-settle(補間の純粋関数)+ CSS 所有権(cinematic-v2 / visual-emphasis のキャレット) | 同 3本目、`act-showcase-trailer-readout.spec.js`(毎フレームの枠の高さ・既読文字の位置・キャレット行の可視性と「キャレット行が枠の下端から1行を超えて遅れない」(PC 1440 / スマホ 390 の長文)・reduced-motion)、`act-showcase-trailer-frame-smoothing`(補間を実行して検査。16/33/64/120ms の各フレーム間隔で毎秒25行の目標を追わせ遅れ≤1行、通常速度は1フレーム半行以下)、`-trailer-caret` |
| title → trailer → assignment → ACT READY の進行 | summary-advance-guard、story-flow/writing-patterns が class 変化で再実行 | 同 1本目 |
| 最終ボード上部の ACT TRAILER(キャスト枠の外) | final-trailer の挿入位置と board-layout | `act-showcase-final-trailer.spec.js` |
| ハンドアウトの読み上げ(handout-live-frame) | `readout` の高さを `scrollHeight`(読み上げ済みの文字量)から決め、CSS の height トランジション(.16s)で動かし、別のスクロール領域 `stage` を追従 | 今回は変更なし | トレーラーとは仕組みが別。測定(PC 1440 / スマホ 390、1フレーム約80msの環境): 1フレームの枠の変化は最大 1行ぶん(PC 29.6px / 行 28.9px、スマホ 20.1px / 行 21.9px)、日本語の文字位置は動かない(0フレーム)。トランジションは実フレームレートでは滑らかにする側で、同じ階段状の問題かは実機のフレームレートでの確認が必要(未確認) |
| reduced-motion | 物理アニメ抑制と物語表示の両立 | `act-showcase-reduced-motion.spec.js`、`act-showcase-reduced-motion-sequence.test.mjs` |
| observer の再実行抑制(タイプライターの churn を無視) | `hasStructuralElementMutation` / `hasLinkedScreenStateMutation` と observe の引数 | `act-showcase-observer-stability.test.mjs`(observe 呼び出しを**文字列で固定**) |
| 登録順 | 1〜10 は本体より前、12〜15 は後。同一 microtask 内の callback 順は登録順 | 順序依存の具体的な失敗例は未確認 |

## 4. 守りになっているテスト

### 4.1 画面比較(`scripts/run-visual-regression.mjs`)

- 実体は `visual-regression-baseline` ブランチの `tests/visual/*`(CI の `visual-regression.yml` が main に上書きコピー)。`run-visual-regression.mjs` は desktop / mobile の2プロジェクトを実行するだけ。
- 撮影対象: login / archive / cast / troops / troop / sheet / account / acts / showcase-generator / sheet-mobile(各 `nova`・`spectrum-neon` のアプリテーマ)+ テーマ見本(`index.html`)。
- **ACT SHOWCASE のカバー済み(46枚、PR #486 + opening 4枚 + 読み込み画面4枚(手順5c)。`act-showcase-fixtures.js` の固定データ、CIコンテナで生成、厳密比較で差分0を確認)**:
  - スタンダード版 `act-showcase-standard.html`: ACT用4テーマ(nova / intron / vlad / lutetia)× desktop / mobile、ページ全体(8枚)。
  - 豪華版 `act-showcase.html` desktop: 4テーマ × opening / title / trailer / handout(PC1)/ assign(PC1)/ summary / 最終ボード(28枚)。場面の進行は NEXT ボタンのラベルで待つ。
  - 豪華版 desktop の**読み込み画面**(手順5c、4テーマ、4枚): データ取得 RPC を保留して固定(`installHeldActShowcaseRoutes`)。opening 4枚は手順5c-A で進捗ラベルが `ACT FILE ACCESS // 05%` になったため基準を更新(差分は進捗ラベル行 y=960〜977 のみ、それ以外は0px)。
  - 豪華版 mobile: nova のみ、同6場面(6枚)。
- **表示の修正(polish)での基準更新**: intron の可読性(A)・読み込み画面の書体(B)・サマリー/最終ボード/代替画像の切れ(D)で、見た目が変わった28枚だけを基準更新(変更領域は基準更新PRの本文に1枚ずつ記載)。背景プリセット差し替え(C)は `showcase-generator.html` の撮影範囲にプリセット一覧が入らないため、generator の基準画像は更新なし。
- **スタンダード版の既知の揺れ(polish の確認で判明)**: スタンダード版 desktop の厳密比較が、約1%の頻度で同じ場所(ゲストのナビ項目 `.cast-nav` の「G01 …」、x=771〜924 / y=731〜761、4774px、実際の画像が暗い)だけ差分になる。`main` でも同じ領域・同じ画素数で再現する(120回中1回)ので、フォント読込みや polish の変更とは無関係。原因の見立ては、ゲストが `act-showcase-standard-guests.js` で別の取得の後に追加され、視覚テストが「キャスト3件」までしか待たないこと(未確認の仮説)。対処案は、視覚テスト側でゲストのナビ項目の出現を待つ(未実施)。
- **マスクなし(手順5a で解除)**: 最終ボードの `.poster-v2-visual` を含めて比較する。キャプションは page.js が最終形で生成するため決定的(マスク解除前に3回連続撮影で差分0を確認し、最終ボード5枚の基準画像だけ更新した)。
- **未カバーで残る**: ダウンロード出力HTML(`showcases/*.html`、`showcase-dedicated-output.js` の生成物)、豪華版 mobile の3テーマ(intron / vlad / lutetia)、finale の単独場面(opening は desktop 4テーマをカバー済み。mobile は未)、PC2 以降の handout / assign、trailer の追従スクロール中の状態、reduced-motion 無効時の見た目。`showcase-generator.html` は撮っているが、プレビュー iframe 内の描画内容は対象外(未確認)。
- 既存の基準画像54枚は 2026-10-05 時点で main と一致。ただし `cast-spectrum-neon-visual-desktop.png` だけは約20%ずれていて、CI が比較対象外にしている。

### 4.2 E2E(`tests/e2e/test-suites.json` 登録)

- 豪華版のみ4本: `act-showcase-neotokyo-stability`(進行・公開背景・trailer追従)/ `-title-render-order` / `-reduced-motion` / `-final-trailer`。いずれもテーマを切り替えない(4本とも `theme` 参照0)。viewport は既定のみ。
- 表示の修正(polish)の検査: `act-showcase-contrast`(全場面×4テーマ+スタンダード版+読み込み画面の文字コントラスト。文字を透明にして撮った画素と実際の文字色で測る。`::before/::after` の生成文字は CDP で矩形を取る。対象外=装飾: 記号だけの生成文字、巨大な透かし文字 `HO`、サマリーの N◎VA スタンプ)/ `act-showcase-clipping`(代替画像の文字・サマリーの名前・識別コード・空の枠)/ `act-showcase-key-style`(最終ボードの KEY STYLE: 3人・担当なし・6人×3幅)/ `act-showcase-trailer-readout`(ACT TRAILER の読み上げ中を毎フレーム記録: 枠の高さの変化は半行以内・既読の文字は動かない・長い本文でキャレット行が画面内・reduced-motion は行単位・終了後に枠を解放。実測の最大変化: PC 17.9px(1行 39.7px)、スマホ 14.4px(1行 31.9px)。変更前は 39.7px / 31.9px)/ `showcase-background-preset-legacy`(偽セッション+モックで、旧プリセットURLのアクトを編集画面で開く)。共通のフィクスチャは `tests/e2e/fixtures/act-showcase-data.js`(visual-regression-baseline の `act-showcase-fixtures.js` と同内容)。
- 実行時間(polish で判明、対策済み): 上の polish の検査(特に `act-showcase-contrast` の豪華版×4テーマと `act-showcase-key-style`)は1本が長く、`ci-public` に入れたままだと `Public and smoke E2E` が約11分になり、従来の `timeout-minutes: 8` を超えてキャンセルされた。アクト紹介の検査は専用グループ `ci-act-showcase`(`Act showcase E2E`、実測 約9分52秒、`timeout-minutes: 20`)へ移し、関係するPRと手動実行のときだけ動かす(判定は `scripts/e2e-changed-groups.mjs`、パスは `tests/e2e/test-suites.json` の `triggerPaths`)。`Public and smoke E2E` は実測 約58秒に戻り、`timeout-minutes: 5`。
- 文言・正規化の「書き換え前の表示が一度も出ない」検査(MutationObserver を初期スクリプトで仕込み、全表示を記録): `act-showcase-final-copy`(読み込み画面・アクセス画面3行・進捗ラベル・NODE ラベル。手順5b/5c)と `act-showcase-name-quotes`(重複引用符の名前。豪華版+スタンダード版+ゲスト。手順5c。スタンダード版のE2Eはこれが初)。
- スタンダード版のE2E: なし。ダウンロード出力HTMLの実描画テスト: なし(`showcase-output-css.test.mjs` は旧出力のハッシュ一致のみ)。

### 4.3 文字列正規表現のみのテスト(見た目の退行を検出できない)

- `act-showcase*` / `showcase*` を対象にする契約テスト 42本のうち、ソースを読んで `assert.match` するだけで実行しないものが 38本(`exec=0`)。実行系は `showcase-output-css`、`act-showcase-guest-publish-and-format`、`character-thumbnail-fallback`、`showcase-cinematic-layout-v2` の4本(中身の深さは未確認)。
- 統合時に壊れる性質のもの: `act-showcase-observer-stability`(observe 引数を固定)、`showcase-theme-phase-contract` / `-surface-system` / `showcase-cinematic-theme-coverage`(CSSの存在確認)、`showcase-css-js-responsibility`、`showcase-asset-version-contract`(`?v=` の一致)、`act-showcase-canonical`。意図は残しつつ検査内容を実装非依存へ直す必要がある(テストは削除・無効化しない)。
- `scripts/audit-act-showcase-architecture.mjs` も html / bootstrap / css をソース文字列で検査(行為は未精査)。

## 5. 統合の推奨手順(リスクの低い順、小さく独立したPR)

| # | PR | 対象ファイル | 期待できる削減量 | 壊れやすい点 | 使えるテスト |
|---|---|---|---|---|---|
| 1 | 視覚テストの追加(**追加済み: PR #486**。コード変更なし、`visual-regression-baseline` ブランチ側) | `tests/visual/*` に act-showcase / standard × 4テーマ × (opening/title/trailer/handout/summary/board) | 0(安全網) | アニメーション中の撮影は不安定。`stabilize.css` と状態固定が必要。基準画像は別ブランチ運用 | これ自体が以降のPRの安全網 |
| 2 | **済(#487)** 確実に死んでいる宣言の削除(CSSのみ) | §1.2 の14ファイル | 237宣言 ≒ 11.4KB(全体の3%)、ファイル数は変わらない | キー一致は @コンテキスト込みだが、`@media` の文字列表記違い・同一ファイル内の再定義が混ざる(237 vs 234)。ダウンロード出力に埋め込まれる3ファイル(dedicated / surface / legibility)を含む | 1 のvisual、`act-showcase-*` E2E 4本、`showcase-theme-*` 契約テスト、`audit:css` |
| 3 | **済** dedicated-themes と theme-surface-system の統合(隣接2本) | 2ファイル + entry + standard.html + `showcase-dedicated-output.js` の import 配列 | 1ファイル減、重複45キー(同値21)。バイトは 2 とほぼ同じ分 | スタンダード版・ダウンロードHTMLに同時に効く。`?v=` の更新漏れ(`showcase-asset-version-contract`)。値が違う24キーは後段の値を採る | 1、`showcase-theme-surface-system`、`act-showcase-standard-loading` |
| 4 | **済** 死んだJSの削除(動作は変えない) | `board-layout` の credits 取得・`remove()`・`readCreditRows`、`scenario-writer.syncPosterCredit`(呼び出しごと)、対応CSSのセレクタ33個(`.poster-v2-panel--credits` / `-credit-table` / `-row` / `-kicker` / `-note`) | JS 約37行、CSS 約37行 | `act-showcase-observer-stability`(observe 引数は不変)、`canonical` / `live-frame-scenario-writer` / `layout-polish` / `ornament-plus` の検査は「存在しないこと」を見る形に変更 | 視覚テスト38枚(許容差0)、E2E 4本 |
| 5 | 本体(builder)が最初から最終文言を作る | アクセス画面の3行・NODE ラベル(**済: 手順5b**)、visual caption(**済: 手順5a**)、キャスト名の引用符正規化の二重実行の一本化(**済: 手順5c**。読み込み時点の正規化に一本化)、読み込み画面・進捗ラベルの旧文言(**済: 手順5c**) | 数十行 + observer 1〜2本(未確認) | 初回描画のちらつき・初期フレームの文言。第11節と同様に修正前後でDOM比較。名前の引用符は3関数を実行して比較済み(trim 以外は同一) | E2E title-render-order / neotokyo-stability、`act-showcase-neotokyo`、`act-showcase-cinematic-polish` |
| 6 | CSS 上書きの畳み込み(値の統合) | poster-v2 ← ornament(44)、cinematic-readability ← layout-polish(26)、supporting-cast ← presentation-tuning(23)、最後に theme 3本(phase / legibility / scene) | 最大でテーマ3本 65KB のうち重複150キー分(量は未確認)。@import が減る | 特異度戦(接頭辞違い)で勝敗が変わる。1つずつ別PRに分ける。theme 3本は豪華版のみで最もリスクが高い | 1(全項目)、E2E 4本、`showcase-theme-phase-contract` |

- 手順2・3は「見た目が変わらないこと」を機械的に説明できる(同一キーの後勝ち / 同値)。手順5・6は値や順序を変えるので、1 のvisualが先に必要。
- 小ファイルの連結(§1.3 最終行、cinematic-fit / top-background-only / handout-live-frame など)は、2〜3 と同じPRにまとめるとレビュー量が減る。並びを変えない限りカスケードは変わらない。
