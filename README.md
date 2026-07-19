# N◎VA CAST ARCHIVE

SupabaseとGitHub Pagesを使用した、トーキョーN◎VA用キャスト管理サイトです。

## 主要画面

- `index.html`：キャスト一覧・検索
- `cast.html`：キャスト閲覧
- `sheet.html`：キャストシート編集
- `account.html`：アカウント・所有キャスト管理
- `image.html`：キャスト画像編集
- `combos.html`：コンボ編集
- `backup.html`：バックアップ／復元
- `login.html`：ログイン・アカウント作成

`register.html`と`edit.html`は旧URL互換用です。新規作成・編集はすべて`sheet.html`へ転送されます。

## 統合キャラクターシート編集

`sheet.html`で次を同一画面から編集できます。

- プロフィール
- スタイルと神業（ヨミガナ付き）
- 能力値・制御値・CSと補正
- 一般技能・スタイル技能
- アウトフィット
- SKD/OFC TSV取り込み
- 旧キャラクターシートJSON取り込み
- 消費経験点の自動計算
- ブラウザ内の一時保存

アカウント画面の「新規キャスト作成」および「シート編集」から利用します。

## アセット構成

一旦の完成版として、ページ固有の番号付き差分ファイルを統合しています。

### 共通CSS

- `css/base.css`：色、背景、基本要素
- `css/auth.css`：認証系画面の共通レイアウト
- `css/ui-ja-v11.css`：共通の日英ラベル
- `css/site-unified-v15.css`：サイト横断の統一装飾
- `css/ui-v25.css`：共通UI部品
- `css/responsive-v29.css`：サイト横断レスポンシブ

共通ファイルは複数画面から参照されるため、ページ固有CSSとは分離しています。

### キャスト一覧

- `css/archive.css`
- `js/archive.js`

旧`archive-ja.css`の内容は`archive.css`へ統合済みです。

### キャスト閲覧

- `css/cast.css`：基本レイアウト
- `css/cast-overrides.css`：技能・パネル・アウトフィット等の完成版調整
- `css/cast-style-editorlike-v49.css`：スタイル技能表
- `js/cast.js`：データ取得と基本描画
- `js/cast-ui.js`：閲覧画面UI調整
- `js/cast-style-details-v47.js`：スタイル技能詳細表示

旧`cast-v*.css`、`cast-ui-v*.js`は統合・削除済みです。

### キャストシート編集

- `css/sheet.css`：基本レイアウト
- `css/sheet-ja.css`：編集画面の日本語表示
- `css/sheet-layout.css`：ヘッダー、能力値、神業、ツールバー等
- `css/sheet-features.css`：技能表、アウトフィット、操作部品
- `js/sheet.js`：DB読込・保存・基本描画
- `js/sheet-draft.js`：ブラウザ内一時保存
- `js/sheet-features.js`：スタイル技能詳細、経験点補正、初期スロット等
- `js/sheet-import.js`：旧キャラクターシートJSON取り込み

旧`sheet-ux-v*.css`、`sheet-v*.css`、`style-skill-details-v32.*`、`skill-layout-v33.css`、各種`*-fix-v*.js`は統合・削除済みです。

### アカウント

- `css/account.css`
- `js/account.js`

旧`account-ja.css`、`account-ux-v2.css`、`account-v17.css`、`account-status-labels.js`は統合・削除済みです。

## 修正時の方針

- 新しい調整のために`*-vXX.css`や`*-fix-vXX.js`を増やさない
- ページ固有の変更は、そのページの安定名ファイルへ追記する
- 複数画面で使う処理だけを共通ファイルへ置く
- HTMLのキャッシュ番号は、対象アセット変更時に更新する
- 削除前に、全HTMLから参照が外れていることを確認する
- 旧画面を復活させず、`sheet.html`を唯一の作成・編集画面として扱う

## 必須DB更新

SupabaseのSQL Editorで次を1回実行してください。

```text
supabase/05_sheet_editor_migration.sql
```

このSQLは既存データを削除せず、新しい列だけを追加します。既存データを破棄するSQLは同ファイル末尾にコメントとして収録しています。

## 経験点計算

- 能力値：10までは1点20EXP、11以上は1点40EXP
- 制御値：16までは1点20EXP、17以上は1点40EXP
- 一般技能：1レベル10EXP
- 固有名詞技能：1レベル5EXP
- スタイル技能：通常10EXP、秘技20EXP、奥義50EXP
- アウトフィット：常備化値が最終外界値以下なら個数制限なく0EXP、それを超える場合は常備化値を加算
- 無条件取得技能の無料レベルは`free_level`で管理

初期取得分として、社会20EXP、コネ15EXP、初期作成170EXPを最終表示から控除します。

## TSV

SKDは日本語ヘッダー、OFCは`target/name/purchase/permanent/...`形式に対応します。OFCの分類は`weapons / armours / outfits / vehicles / residences`を自動判定します。