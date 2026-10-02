# 2026-09-18 旧互換RPC呼出し状況の再調査と段階1(REVOKE)

対象: `koprmbkoftuuffslhsvt`。本番・検証共通。

## 背景

`docs/DB_RECONCILIATION_20260906.md` の時点では、本番の `sheet-master-autofill.js` と
`troop-combo-rule-v2.js` が `public.can_use_master_search()`(`has_privileged_editor_tools()`
を返すだけの互換ラッパー、41番SQLで権限整理)をまだ直接呼んでいたため、削除せず維持していた。

2026-09-18時点で、旧RPC呼出しの実際の推移をedge_logsで再確認した。

## 呼出し数の日別推移

`public.can_use_master_search()`:

| 日付 | 呼出し数 |
|---|---|
| 2026-09-04 | 31件 |
| 2026-09-05 | 31件 |
| 2026-09-08 | 9件 |
| 2026-09-09 | 4件 |
| 2026-09-10 | 12件 |
| 2026-09-11以降 | 0件(継続) |
| 直近24h | 0件 |

比較対象の正規RPC `public.has_privileged_editor_tools()` は、同じ期間を通じて
数百〜数千件/日のトラフィックが継続している。これにより、ログ収集の仕組み自体は
正常に機能しており、旧RPCの呼出し減少がログ欠落ではなく実際のクライアント移行を
反映していることを確認した。

## コード側の確認

検証repo(`tnx-cast-archive-test`)・本番repo(`tnx_cast_list`)いずれの `main` でも、
`js/` 配下に `can_use_master_search` への参照は存在しない(`has_privileged_editor_tools()`
のみを呼んでいる)。

```bash
grep -rn "can_use_master_search" js/
```

両repoとも該当なし。

## 再調査に使用したSQLクエリ

Supabase Logs Explorer(edge_logs)で、RPCエンドポイントへのPOSTリクエスト数を
日別に集計。

```sql
-- 旧互換RPCの日別呼出し数
select
  cast(timestamp as date) as day,
  count(*) as calls
from edge_logs
cross join unnest(metadata) as m
cross join unnest(m.request) as request
where request.path = '/rest/v1/rpc/can_use_master_search'
  and request.method = 'POST'
group by day
order by day desc;
```

```sql
-- 比較対象: 正規RPCの日別呼出し数(ログ収集自体が機能しているかの確認用)
select
  cast(timestamp as date) as day,
  count(*) as calls
from edge_logs
cross join unnest(metadata) as m
cross join unnest(m.request) as request
where request.path = '/rest/v1/rpc/has_privileged_editor_tools'
  and request.method = 'POST'
group by day
order by day desc;
```

```sql
-- 直近24hの旧互換RPC呼出し数
select count(*) as calls_last_24h
from edge_logs
cross join unnest(metadata) as m
cross join unnest(m.request) as request
where request.path = '/rest/v1/rpc/can_use_master_search'
  and request.method = 'POST'
  and timestamp > now() - interval '24 hours';
```

## 段階1: 適用した変更(本PRの範囲)

`supabase/47_revoke_legacy_master_search_client_access.sql` で、
`authenticated` ロールからのEXECUTE権限のみをREVOKEする。

- `public.can_use_master_search()` の関数定義はDROPしない。
- `service_role` の権限は変更しない。
- 本PRの時点では、このmigrationファイルはrepositoryにcommitするのみで、
  実際にSupabaseプロジェクトへ適用(実行)はしていない。適用は別途明示的な
  承認を得てから行う。

## 段階2(実際のDROP)に進む前のチェックリスト

- [ ] 段階1のREVOKEを実際にDB適用してから最低1週間、関連するエラー・問い合わせが
      発生していないことを確認する。
- [ ] REVOKE適用後の期間についても、`can_use_master_search` 呼出しが
      引き続き0件であることをedge_logsで再確認する(REVOKE後に呼び出そうとした
      形跡があれば、想定外のクライアントが残っている可能性があるため要調査)。
- [ ] リポジトリ全体(検証・本番いずれも)を再検索し、`can_use_master_search` への
      新たな参照が増えていないことを確認する。
- [ ] `supabase/41_reconcile_compatibility_rpc_access.sql` の当時の経緯記述、および
      `docs/DATABASE_MIGRATIONS.md` の関連記述を、DROP実施後の状態に合わせて更新する。

上記すべてを満たしてから、別のmigration・別PRとして関数本体のDROPを行う。
本PRではDROPを行わない。
