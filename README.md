# N◎VA CAST ARCHIVE

SupabaseとGitHub Pagesを使用したトーキョーN◎VA用キャスト管理サイトです。

## 統合キャラクターシート編集

`sheet.html`で次を同一画面から編集できます。

- プロフィール
- スタイルと神業（ヨミガナ付き）
- 能力値・制御値・CSと補正
- 一般技能・スタイル技能
- アウトフィット
- SKD/OFC TSV取り込み
- 消費経験点の自動計算
- 自動保存

アカウント画面の`REGISTER NEW CAST`および`EDIT SHEET`から利用します。

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

## TSV

SKDは日本語ヘッダー、OFCは`target/name/purchase/permanent/...`形式に対応します。OFCの分類は`weapons / armours / outfits / vehicles / residences`を自動判定します。
