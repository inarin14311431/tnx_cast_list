# アウトフィット・データ設計

最終更新: 2026-09-04

この文書は、CAST ARCHIVE のアウトフィットについて「どこを正規値として扱うか」を判断するための基準資料である。
取込、編集、保存、閲覧、モバイル、キャラクターシート倉庫への転記、差分比較を変更する場合は、本資料の方針を先に確認すること。

## 基本方針

`character_outfits` は、既存のトップレベル列と `ofc_details` JSON のハイブリッド構造を採用している。
どちらか一方を全面的な正規データとみなしてはならない。

- キャスト固有の基本値・ユーザー編集値は、原則としてトップレベル列を正規値とする。
- OFC由来またはカテゴリ固有の詳細性能は、原則として `ofc_details` を正規値とする。
- 旧形式との互換性のため、同じ論理値を両側に保持する項目がある。
- 互換ミラーが存在する場合も、読み取り優先順位は項目ごとに固定し、暗黙に入れ替えない。
- 正規値とは異なる保存先は「互換読み取り」または「互換ミラー」として扱い、新規編集コードから無条件に二重書込みしない。

## 現在の正規保存先

### トップレベル列を正規とする項目

- `category`
- `name`
- `purchase_value`
- `experience_cost`
- `concealment`
- `slot`
- `attack`
- `range`
- `control_modifier`
- `cs_modifier`
- `description`
- `sort_order`

特に `control_modifier`、`cs_modifier`、`description` はトップレベルを正規値とする。
`ofc_details` 内に旧値や補助値が存在しても、現在値を上書きする根拠にはしない。

### `ofc_details` を正規とする項目

- `concealment_penalty`
- `parry`
- `speed`
- `electronic_control`
- `defense_s`
- `defense_p`
- `defense_i`
- `ianus_surface`
- `ianus_deep`
- `ianus_none`
- `tron_software`
- `tron_support`
- `tron_hardware`
- `crew`
- `sf`
- `residence_entry`
- `residence_electric`
- `residence_area`
- `manufacturer`
- `page_number`
- `major_category`
- `minor_category`

このうち `electronic_control`（電制）は **`ofc_details.electronic_control` が唯一の現行正規値** とする。
トップレベルの `electronic_control` 列は旧データの読み取り互換専用であり、現行エディタは新規保存先として使用しない。

## electronic_control の互換ポリシー

読み取り時:

1. `ofc_details.electronic_control` が存在すれば必ずそれを採用する。
2. JSON側が空の場合のみ、旧トップレベル `electronic_control` をフォールバックとして読む。
3. 両方に異なる値がある場合、JSON側を正規値として採用する。

編集・保存時:

1. PC編集、モバイル編集、OFC補完、外部データ取込はいずれも `ofc_details.electronic_control` を更新する。
2. 新規コードはトップレベル `electronic_control` へ二重書込みしない。
3. 旧トップレベル列は当面削除しない。既存・外部・過去データの読み取り互換を維持するためである。
4. 将来トップレベル列をDBから削除する場合は、全既存データと全呼び出し元の移行確認を別マイグレーションとして行う。

## 読み取り境界

PC閲覧・モバイル閲覧・キャラクターシート倉庫への転記は、生のDB行を直接解釈せず、`normalizeOutfitForView()` を通した論理モデルを使用する。

差分比較も同じ論理値の優先順位に従うこと。特に電制について、トップレベル列とJSONを別項目として比較してはならない。

## 取込境界

キャラクターシート倉庫等からの取込では、外部形式を内部の論理項目へ変換した後、正規保存先へ振り分ける。

- 電制 → `ofc_details.electronic_control`
- 制御値修正 → `control_modifier`
- CS修正 → `cs_modifier`
- 防御 S/P/I → `ofc_details.defense_s/p/i`
- 隠匿修正 → `ofc_details.concealment_penalty`

外部形式の項目名をそのままDB列設計へ持ち込まない。

## 変更時の確認項目

アウトフィットの保存先・正規化処理を変更する場合は、最低限次を確認する。

1. PCデータ取込
2. OFCマスタ追加・補完
3. PC編集の読込・保存
4. モバイル編集の読込・保存
5. PC閲覧
6. モバイル閲覧
7. キャラクターシート倉庫へのデータ転記
8. JSONP差分比較
9. 既存データの互換フォールバック
10. 保存後の再読込で値が変化しないこと

## 設計上の禁止事項

- `ofc_details` を全面的に正規値へ変更する。
- トップレベル列を全面的に正規値へ変更する。
- `control_modifier` / `cs_modifier` をJSON側優先へ戻す。
- `description` をOFC詳細側から無条件に上書きする。
- `electronic_control` をトップレベル優先で読む。
- 正規値の所在を確認せず、表示上の都合だけで別フィールドへコピーする。

この方針を変更する場合は、コード変更だけでなく本資料も同じPRで更新する。
