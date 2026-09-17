# 変更管理 / Change Management

最終更新: 2026-09-17

この文書は、TNX CAST ARCHIVEで安全に変更を作成し、検証し、本番へ反映するための標準手順を定める。

## 1. 原則

- 実装は検証repoから始める。
- 本番repoを実験環境にしない。
- 1 PR = 1つの明確な目的を原則とする。
- cleanup、機能追加、DB変更、UI redesignを無関係に混ぜない。
- 変更前後の契約をテストで確認する。
- 既存データを変換する変更はrollback/recovery方法まで考える。

## 2. 標準フロー

```text
検証 main
  ↓ branch
実装 + test
  ↓
verify / relevant E2E / visual / quality
  ↓
検証 PR
  ↓ CI green
検証 main merge
  ↓ 実環境確認
本番同期 branch / PR
  ↓ CI green
本番 main merge
```

## 3. 作業開始前

必ず確認する。

1. repository名
2. base branch
3. base SHA
4. open PR / unfinished branch
5. 変更対象の既存docs
6. 関連audit/test
7. Supabase変更の有無
8. productionとの差分

AIは過去会話だけを根拠に最新状態を決めない。GitHub上のmain/PR/commitを確認する。

## 4. Branch

branch名は目的が分かるものにする。

例:

- `fix/mobile-new-character-skills`
- `refactor/navigation-shared-core`
- `docs/ai-handoff`
- `test/editor-regression-*`

既存branch名だけを見て実装済みと判断しない。必ずmainとの差分を確認する。

## 5. PR scope

PR本文では最低限以下を明示する。

- 目的
- 変更ファイル/責務
- DB変更の有無
- user-facing behaviorの変化
- 実施テスト
- 未実施テストと理由
- rollback上の注意

大規模refactorは段階化する。

推奨:

1. pure shared core追加
2. 片側adapterを切替
3. regression確認
4. もう片側を切替
5. legacy重複削除

ただし途中状態が危険なら1 PR内でatomicに行い、commitを段階化する。

## 6. 検証repoでの完了条件

原則として:

- `npm run verify` 成功
- 変更領域のE2E成功
- CSS/Theme変更ならVisual確認
- accessibility/performance変更ならQuality確認
- PR CI green
- 実ブラウザで関連操作確認

検証repoではDB writeを伴う追加確認を通常の完了条件に含めず、必要性を判断して `live-write` を明示実行する。本番repoはテスト分類runnerが未導入で、既存CIには保存・原状復帰テストが含まれるため、`TESTING_STRATEGY.md` 第6節の環境差と第9節の共有DB条件を確認する。

## 7. 本番反映

検証mainの確定点を本番repoへ同期する。

本番同期時は:

- 検証commit/PRを本文に記録する。
- 検証に存在しない独自修正を混ぜない。
- 本番repoの既存変更を上書きしない。
- quality contract parityを維持する。
- runtime・資料・テスト構成の同期範囲を区別する。2026-09-17時点では検証専用E2Eコマンドが本番に未導入であり、資料同期だけでテスト構成まで同期した扱いにしない。
- CI greenを確認してからmergeする。

「検証で動いたので本番CIは不要」としない。

## 8. DB変更

DB変更はコード同期と別の危険度を持つ。

### 禁止

- 適用済みmigrationの編集
- old migrationの再実行によるcleanup
- manifestだけ見てlive適用済みと決める
- RLSを一時的に緩めたままmerge
- backupなしの破壊的データ変換

### 手順

1. `docs/DATABASE_MIGRATIONS.md` を読む
2. live schema/stateを確認する
3. 新しい最高番号migrationを追加する
4. manifestへappendする
5. security/compatibilityを確認する
6. `audit:migrations`, `audit:security`, `verify`
7. 適用後に `scripts/database-invariants.sql` を確認する
8. application側のread/writeを確認する

migration historyとdeployment ledgerを混同しない。

## 9. Shared DBを扱うテスト

検証repoと本番repoが別でも、live testは共有状態へ触れる可能性がある。

- production write testとverification write testを同時に走らせない。
- approved test owner以外を対象にしない。
- write testを強制cancelしない。
- restoreは新しい他者変更を上書きしないことを確認する。

詳細は `tests/e2e/README.md`。

## 10. Cache busting / module version

`?v=` はブラウザcache更新のための契約として扱う。

- 変更していないmoduleを無意味に一括bumpしない。
- import元/HTML entryのcache関係を確認する。
- 同じshared moduleをPC/Mobileが読む場合、片側だけ古いversion指定を残さない。
- version変更だけのnoiseを大規模に混ぜない。
- `audit:cache` の契約を優先する。

## 11. Refactor

refactorの目的は「短くすること」ではなく、重複した責務や事故点を減らすこと。

### 共通化前に確認

- 同じ入力か
- 同じ出力か
- side effectは同じか
- DOM/UI依存はないか
- error behaviorは同じか
- PC/Mobileのどちらかだけ必要なfeatureはないか

共通化後はPC/Mobile双方のcontract testを追加する。

## 12. Test failure時

CI failureを以下の順で切り分ける。

1. 変更による実不具合
2. test fixture / selectorの古さ
3. async timing / flaky
4. shared DB / auth環境
5. workflow/config問題

rerunで通っただけでは原因解消としない。再現しない場合もログとfailure pointを確認する。

## 13. Documentation

設計を変えるPRではdocs更新を完了条件に含める。

特に以下は必須:

- canonical data変更
- shared core責務変更
- PC/Mobile境界変更
- migration policy変更
- CSS/Theme ownership変更
- test/CI分類変更
- production promotion手順変更

## 14. 緊急修正

緊急時も原則は検証repo先行。

例外的に本番を直接直す必要がある場合は:

1. 本番差分を最小化
2. 回帰テストを追加
3. 直後に検証repoへ逆同期
4. 両repoのparityを確認
5. 事後資料へ理由を残す

片側だけのhotfixを恒久状態にしない。
