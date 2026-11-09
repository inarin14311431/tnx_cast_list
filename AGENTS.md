# AGENTS.md

このrepoは**本番**(`inarin14311431/tnx_cast_list`)です。検証repo(`inarin14311431/tnx-cast-archive-test`)で確認が取れたものだけを同期する場所で、
実装や実験をここで行いません。

## 資料の正本は検証repoにある

設計資料・作業ルール・同期基準点・テスト方針などの**正本は検証repoだけ**が持ちます。本番repoには資料(`docs/`)を置きません。
本番に古い資料を残して読み違えるのを防ぐためです。作業の前に、検証repoの次を読んでください。

- 作業ルール: https://github.com/inarin14311431/tnx-cast-archive-test/blob/main/AGENTS.md
- 資料(設計・テスト・CI・本番反映の手順・今の同期基準点): https://github.com/inarin14311431/tnx-cast-archive-test/tree/main/docs
  (入口は `docs/CURRENT_STATE.md` と `docs/CHANGE_MANAGEMENT.md`)

コード内のコメントや `supabase/README.md` などが `docs/…` を指していても、それは検証repoの資料のことです(本番には無い)。

## このrepoで守ること

- runtime(`js/`・`css-next/`・HTML・`config/`・`supabase/`)は検証と同一に保つ。ここで直接直さない。検証で直し、同期する。
- 同期の手順(同期前に対象ファイルが検証の直前と一致することを確かめる、CI が緑になってからマージする、など)は、検証repoの `docs/CHANGE_MANAGEMENT.md` に従う。
- 本番repoへの書き込み(commit・push・PR・マージ)は、**その都度の許可が要る**。許可がなければ書き込まない。拒否されたら迂回せず、報告して止まる。
- 共有DB(検証と本番は同じSupabaseプロジェクト)への変更は、実DBへの適用を別の確認として扱う。
- 秘密情報(service-role key、テスト用パスワードなど)をコード・issue・PR・チャットに書かない。

## コマンド

- `npm run verify` — 全audit + 全テスト。成功時は1行(`VERIFY OK: …`)。
- `npm run check:js` — JS の構文チェック。
