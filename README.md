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

キャストの公開状態は次の2種類だけを使用します。

- `public`：公開
- `private`：非公開

旧仕様の`draft`、`unlisted`、`archived`は使用しません。

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

SupabaseのSQL Editorで次を番号順に1回ずつ実行してください。

```text
supabase/05_sheet_editor_migration.sql
supabase/10_transactional_character_save.sql
supabase/11_showcase_publish_security.sql
supabase/12_showcase_history_only.sql
supabase/13_private_act_history.sql
supabase/14_visibility_two_state.sql
supabase/15_owner_scoped_act_history.sql
supabase/16_style_separator_none.sql
```

`10_transactional_character_save.sql`は、キャスト本体・技能・アウトフィットを1トランザクションで保存するRPCを追加します。保存途中でエラーが発生した場合は全処理がロールバックされ、既存の技能や装備は変更されません。また、技能の`free_level`を保持します。

`11_showcase_publish_security.sql`は、別の公開者が所有するアクト紹介ファイル名を上書きできないよう、アクト履歴登録RPCに所有者確認を追加します。

`12_showcase_history_only.sql`は、GitHub Pagesへ公開せずに参加アクト履歴だけを登録するRPCを追加します。既存の公開URLがある履歴を「履歴のみ登録」で更新した場合、公開URLは保持されます。

`13_private_act_history.sql`は、履歴登録を現在のログインユーザーとして実行するRPCを追加します。公開キャストに加えて、ログインユーザー自身が所有する非公開キャストを参加アクト履歴へ登録できます。GitHub Pagesの公開内容は変更しません。

`14_visibility_two_state.sql`は、旧状態の`draft`、`unlisted`、`archived`を`private`へ変換し、公開状態を`public`と`private`の2種類だけに制限します。

`15_owner_scoped_act_history.sql`は、参加履歴の登録・削除と経験点更新をキャスト所有者の範囲に限定します。アクト紹介HTMLへ他人の公開キャストを掲載しても、そのキャストの履歴や経験点は変更されません。履歴再登録時も既存の`earned_experience`は保持されます。

`16_style_separator_none.sql`は、既存のスタイル技能区切り行を種別`none`へ変換し、今後どの保存経路から登録しても`STYLE_SEPARATOR`の種別を必ず「なし」に固定します。

これらのSQLは既存キャストを削除しません。`14_visibility_two_state.sql`で旧状態のキャストがあった場合は、非公開キャストとして保持されます。

## アクト紹介の公開と履歴登録

`publish-showcase` Edge Functionは、ログイン済みユーザーであればGitHub Pagesへの公開を利用できます。`SHOWCASE_ADMIN_USER_IDS`と`SHOWCASE_ADMIN_EMAILS`は使用しません。

同じアクト識別名／slugは、最初に登録したユーザーだけが更新できます。別ユーザーが同じ識別名で上書きすることはできません。また、`script`、イベント属性、`javascript:` URL、iframe等を含むHTMLは公開できません。

04「生成・公開」では次の2種類を利用できます。

- `履歴のみ登録`：HTML生成とGitHub Pages公開を行わず、参加アクト履歴だけを保存
- `GitHub Pagesへ公開`：生成HTMLを公開し、同時にログインユーザー自身の参加アクト履歴を保存

出演枠には、他人の公開キャスト、自分の公開・非公開キャスト、手動追加キャストを合計6名まで追加できます。これらはHTML生成、ダウンロード、コピーの対象です。

参加履歴へ登録されるのは、ログインユーザー自身が所有する登録済みキャストだけです。他人の公開キャストと手動追加キャストはHTMLには掲載できますが、履歴登録・削除・経験点更新の対象にはなりません。同じ実アクトを複数ユーザーが別々の識別名で登録した場合も、各ユーザーは自分のキャストの履歴と経験点だけを管理します。

GitHub Pagesへの公開は、出演キャストがすべて公開キャストの場合だけ利用できます。非公開キャストが1名でも含まれる場合は、HTML生成・ダウンロード・コピーは可能ですが、GitHub Pagesへの公開ボタンが無効になります。生成HTML内の非公開キャストにはキャストデータベースへのリンクを出力しません。

`supabase/15_owner_scoped_act_history.sql`を実行した後、`supabase/functions/publish-showcase/index.ts`をEdge Functionへ再デプロイしてください。SQLとEdge Functionの両方が更新されるまで、GitHub Pages公開時の履歴所有者制限は完全には反映されません。

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
