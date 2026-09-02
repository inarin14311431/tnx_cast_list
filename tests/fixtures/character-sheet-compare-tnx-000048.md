# TNX-000048 comparison regression notes

Reference snapshots in `character_snapshots` on 2026-09-01:

- `比較前 CAST ARCHIVE 2026/09/01 14:49`
- `比較後`

Observed representation-only differences that must not be treated as data changes:

- Outfit concealment: `14/0` vs `14` with penalty stored separately.
- Style skill detail: `@@TNX_STYLE_DETAIL_V1@@` JSON wrapper vs the same visible `description` text after JSONP import.
- Legacy outfit slot sentinels such as `0` vs generic stored labels (`全身`, `片手持ち`) where the JSONP importer cannot round-trip the original label.
- Database identity and row ordering are not comparison data.

Fields that are present in JSONP/OFC detail data (defense values, purchase target, permanent cost, electronic control, concealment penalty, visible descriptions) remain comparable and should still produce a real difference when values differ.
