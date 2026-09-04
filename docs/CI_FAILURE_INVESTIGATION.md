# CI障害調査設計

## 目的

GitHub Actions のテストが失敗した際、Actions画面や外部ツールからジョブログ本文を直接取得できない場合でも、原因箇所・失敗テスト・期待値と実値を再現可能な形で特定できるようにする。

## 基本方針

CIの失敗は、次の順序で情報量の多い経路から調査する。

1. Workflow run / job / step の状態を確認し、どの工程で失敗したかを特定する。
2. ジョブログ本文を取得できる場合は `AssertionError`、`ERR_ASSERTION`、`not ok`、`FAIL`、対象ファイル名などを検索する。
3. ログ本文を取得できない場合は、CIが生成した診断artifactを取得して解析する。
4. artifactが存在しない、または情報不足の場合は、テストファイル単位・グループ単位の二分探索で失敗範囲を絞る。
5. 失敗したテストと実装の契約を照合し、テストが旧仕様を期待しているのか、実装が互換要件を壊しているのかを切り分ける。

## Regression checks の診断ログ

`.github/workflows/regression.yml` の Node regression tests は、標準出力と標準エラーを `node-regression-test.log` に保存する。

```bash
set -o pipefail
npm test 2>&1 | tee node-regression-test.log
```

`set -o pipefail` を必須とする。これがない場合、`npm test` が失敗しても `tee` の成功終了コードによってstep全体が成功扱いになる可能性がある。

テスト実行後は `actions/upload-artifact` を `if: always()` で実行し、成功・失敗に関係なくログを `node-regression-test-log` artifactとして保存する。保存期間は7日とする。

これにより、Actionsのジョブログ取得経路が利用できない場合でも、artifactから次の情報を確認できる。

- 失敗したテスト名
- テストファイル名
- AssertionError / 例外種別
- expected / actual
- スタックトレース
- Node test runner の集計結果

## 調査フロー

### 1. 失敗工程の特定

Workflow run の各job・stepを確認する。Regression checks では、前段の audit が成功し `Run Node regression tests` のみ失敗している場合、まずNodeテストに調査対象を限定する。

### 2. artifactの取得

対象runのartifact一覧から `node-regression-test-log` を取得し、ログ内を次の語で検索する。

- `not ok`
- `AssertionError`
- `ERR_ASSERTION`
- `Error:`
- `FAIL`
- 変更対象の識別子・プロパティ名

最初に見つかった文字列だけで結論を出さず、その前後のテスト名・expected / actual・スタックトレースまで確認する。

### 3. 契約との照合

失敗テストが見つかったら、次の順に確認する。

1. 変更後の正規仕様を確認する。
2. 後方互換として残すべき読込経路を確認する。
3. 保存時の正規形と読込時のフォールバックを混同していないか確認する。
4. 「明示的な空欄」が古い値を復活させないことを確認する。
5. テストが旧保存形式を正規仕様として固定していないか確認する。

仕様変更が意図されたものであれば、旧仕様を固定するテストを修正する。後方互換要件を壊している場合は実装側を修正する。単にテストを通すためだけの期待値変更は行わない。

### 4. artifactで原因が特定できない場合

テストをファイル単位またはグループ単位で分割し、失敗範囲を二分探索する。

例:

```bash
node --test tests/foo.test.mjs
node --test tests/bar.test.mjs
```

対象が多い場合は半分ずつ実行し、失敗側だけをさらに半分にする。ログ取得不能でも有限回で失敗ファイルを特定できる。

### 5. 再発防止

修正時は、発生した不具合を直接再現する回帰テストを残す。データ契約の変更では、最低限次を組み合わせて確認する。

- 現行正規形式の読込
- 旧形式の後方互換読込
- 保存後の正規形式
- save → load → save の往復
- 明示的クリア
- PC / mobile など複数経路がある場合は各経路

## 構造テストの設計原則

構造・責務境界を検査するテストでは、契約に含まれない実装上の可変値を固定しない。

特にES Moduleのキャッシュバスター（例: `?v=1`, `?v=2`）は配信キャッシュ更新のための世代番号であり、モジュール責務や認可順序の契約ではない。したがって、次のような固定バージョン検査は避ける。

```js
assert.match(source, /module\.js\?v=1/);
```

代わりに、モジュール名とバージョン形式のみを検査する。

```js
assert.match(source, /module\.js\?v=\d+/);
```

ロード順を確認する場合も、固定文字列の `indexOf` ではなく、バージョン非依存の正規表現で位置を取得する。

```js
const importIndex = source.search(/import\("\.\/module\.js\?v=\d+"\)/);
```

今回の障害では、正当なキャッシュ世代更新 `v=1 → v=2` を既存回帰テストが実装破壊として誤検知した。以後、構造テストは「何をロードするか」「どの順序でロードするか」「どの責務境界を守るか」を検査し、キャッシュ世代そのものは検査対象にしない。

## CI設計上の注意

- 診断処理によって本来のテスト終了コードを隠さない。
- artifactのアップロード失敗を、テスト本体の成否と混同しない。
- ログには秘密情報・認証情報を出力しない。
- artifactは調査用途に必要な期間だけ保持する。
- 診断用の変更を入れた場合も、通常の品質・セキュリティ・回帰チェックを省略しない。
- テストは仕様・責務境界を検証し、キャッシュバスターなどの非契約値に依存させない。

## 今回採用した標準

Regression checks では、Node regression test の全出力を `node-regression-test.log` に保存し、`node-regression-test-log` artifactとして7日間保持する。この方法を、今後のNode回帰テスト失敗時の第一診断経路とする。
