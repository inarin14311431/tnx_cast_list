# アウトフィット旧列監査 2026-09-04

## 対象

- `character_outfits.defense`
- `character_outfits.mundane_modifier`

## 実DB監査

- `character_outfits`: 820行
- `defense` 非空: 0行
- `mundane_modifier` 非0: 0行
- 防具: 132行
- `ofc_details.defense_s/p/i` のいずれかを持つ防具: 108行
- 残り24行は旧 `defense` に値が残っているのではなく、旧列も空であり防御値未登録

したがって、現時点で両旧列から移行すべき実データは存在しない。

## 依存監査

DB関数・ビューのうち両列を参照するものは `public.save_character_bundle` のみ。

クライアントでは `js/outfit-view-model.js` が旧 `defense` を `parseLegacyDefense()` で読み取りフォールバックしている。
`js/sheet-save-payload.js` は `defense: ""` を互換目的で送信している。
`mundane_modifier` は現行アウトフィット契約では廃止済みで、互換正規化でも破棄される。

## 廃止手順

1. クライアントの旧 `defense` 読み取りフォールバックを撤去する。
2. 保存payloadから `defense` を外す。
3. `save_character_bundle` から `defense` / `mundane_modifier` のINSERT列・recordset項目を外す。
4. 回帰テストで `ofc_details.defense_s/p/i` の保存・読込を確認する。
5. DB上でDROPを含むトランザクション試験を行い、必ずROLLBACKして件数・正規防御値を確認する。
6. 全CI成功後に `defense` / `mundane_modifier` をDROPする。

## 安全条件

- DROP前に旧列へ非空・非0データが出現した場合は中断する。
- `ofc_details.defense_s/p/i` は上書きしない。
- 既存キャスト・アウトフィット行を削除または再作成しない。
