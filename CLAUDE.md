@AGENTS.md

# CLAUDE.md

このファイルはClaude Codeがセッション開始時に自動で読み込む。共通ルールは上記でimportした
`AGENTS.md` が正本。ここに書くのはClaude Code固有の項目だけ。

## モデルの使い分け

定型的な1〜2ファイルの修正はSonnetで十分。広範囲の調査・設計判断が必要な場面でだけOpusに
切り替える。

## `/clear`

話題が大きく変わるタイミング(例: 個別バグ修正→本番同期)では `/clear` を検討する。

## CI確認

`gh pr checks --watch` を1回だけ行う。失敗したら `gh run view <run-id> --log-failed | tail -n 80`
で失敗部分だけを読む。何度もポーリングしない。

## 日本語で回答すること

このプロジェクトでのやり取りは日本語で行う。
