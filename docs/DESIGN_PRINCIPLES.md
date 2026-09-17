# 設計理念 / Design Principles

最終更新: 2026-09-17

この文書は、TNX CAST ARCHIVEで設計判断に迷った場合の優先順位を定める。

## 1. データ保全を最優先する

UIの見栄え、短期的なコード量削減、実装速度より、既存データが同じ意味で読み書きできることを優先する。

- 保存後の再読込で意味が変わらないこと。
- 旧データ・外部取込データの互換境界を壊さないこと。
- DB上の正規値の所在をUIの都合で変更しないこと。
- 変換処理は入口/出口で明示し、生DB行を各画面が独自解釈しないこと。

アウトフィットの正規値は `docs/OUTFIT_DATA_ARCHITECTURE.md` を唯一の基準とする。

## 2. Shared coreとUI adapterを分ける

PC版とMobile版は同じ業務ルールを共有するが、同じUI実装を強制しない。

共通化に向くもの:

- pure function
- 正規化
- payload生成
- 初期値
- 計算
- validation rule
- URL/ID解釈
- UI非依存のDB service

各画面に残すもの:

- DOM構築
- イベント配線
- focus
- dialog
- 保存ボタン表示
- レスポンシブ固有表現

目的は「ファイル数を減らすこと」ではなく「同じ業務ルールが片側だけ修正される事故を減らすこと」である。

## 3. Source of Truthを明確にする

同じ情報を複数箇所に持つ場合、必ずどこが正規値かを定義する。

例:

- Theme ID/順序: `js/theme-registry.js`
- Theme CSS manifest: `css-next/themes/index.css`
- CSS ownership: `docs/CSS_ARCHITECTURE.md`
- migration順序: `supabase/migrations-manifest.json`
- E2E分類: 検証repoでは `tests/e2e/test-suites.json`。本番repoは分類runner未導入のため、現在の実行対象は `.github/workflows/playwright.yml` を確認する（詳細は `docs/TESTING_STRATEGY.md` 第6節）。
- Quality gate契約: `quality-gates.json`

新たな重複設定を追加するより、既存source of truthから生成・参照する。

## 4. 互換性は境界で吸収する

旧形式や外部形式を内部モデルの中心へ持ち込まない。

- JSONP/外部サービス固有キーはimport adapterで変換する。
- 旧キーはnormalization境界で受け付ける。
- UIは可能な限り正規化済みモデルを見る。
- 保存側は現行正規形式へ書く。

互換性のための二重書込みは、明確な移行設計なしに追加しない。

## 5. Securityは機能要件として扱う

Securityは後付けレビュー項目ではない。

- Browser clientにservice-roleを置かない。
- 認証/owner scopeを外さない。
- return URLはsame-origin / app base pathを維持する。
- 管理機能はprotected capabilityを通す。
- RLSを回避するためにクライアント側へ権限を移さない。
- destructive actionは対象を明示的に限定する。

`scripts/audit-security.mjs` が守っているinvariantを、変更の都合で削除しない。

## 6. CSSはownershipとcascadeを設計する

CSSはその場しのぎの上書きを増やさない。

- `!important` を使わない。
- JavaScriptからstyle/linkを生成しない。
- page entry + themes manifestの契約を維持する。
- reusable UIはcomponents、PC editor固有はeditor、画面固有はpagesへ置く。
- concrete theme selectorは `css-next/themes/` だけに置く。

詳細は `docs/CSS_ARCHITECTURE.md` と `docs/THEME_SYSTEM.md`。

## 7. 小さく、検証可能で、戻せる変更にする

大規模cleanupと機能変更を同じPRに混ぜない。

良いPR:

- 目的が1つ
- 変更責務が説明できる
- before/afterのテストがある
- DB変更有無が明確
- rollback方法が想像できる

大規模共通化は、一度に画面を統合せず、pure core → service → adapterの順に段階化する。

## 8. 観測できない成功を成功扱いしない

「エラーが出なかった」だけで正常と判断しない。

- 保存は再読込後の値まで確認する。
- importは差分比較まで確認する。
- UIはDOM状態・横スクロール・focus・操作結果まで確認する。
- 非同期処理は失敗時の表示と再試行可能性も確認する。

## 9. テストは実装の補助ではなく契約

テスト失敗を消すためにassertionを弱めない。

- pure logic → Node test
- 静的構造/禁止事項 → audit script
- ユーザー操作 → Playwright E2E
- 見た目 → Visual Regression
- accessibility/performance → Quality workflow
- security invariant → Security audit
- live DB書込み → 明示的なlive-writeのみ

詳細は `docs/TESTING_STRATEGY.md`。

## 10. DB履歴は書き換えない

適用済みmigrationは履歴であり、現在コードの美観のために編集しない。

- 修正は新しいmigrationを追加する。
- manifest順序を守る。
- repository historyとlive deployment stateを混同しない。
- DB変更後はinvariantをlive DBでも確認する。

詳細は `docs/DATABASE_MIGRATIONS.md`。

## 11. AI特有の注意

AIは次を推測だけで実行してはならない。

- 列名や正規値
- Supabase RPCの引数
- branchが実装済みかどうか
- 過去migrationの適用状態
- PC/Mobileが同じ責務かどうか
- CIが通るはずという判断

不明な場合は、コード・manifest・migration・workflowを取得して確認する。

## 12. 設計変更時の文書更新

この理念に影響する変更は、実装だけで完了扱いにしない。関連する `docs/` とテスト契約を同じPRで更新する。
