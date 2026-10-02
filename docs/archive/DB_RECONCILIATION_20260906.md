# 2026-09-06 実DB整合性対応

対象: `koprmbkoftuuffslhsvt`。本番・検証共通。画像公開とDB共有は意図した仕様として維持。

## 照合結果と互換性

- publicスキーマの14テーブルはRLS有効。
- マスタ2テーブルのRLSは内部スキーマのヘルパーを参照。
- キャスト保存RPC2本はSECURITY INVOKER。
- 36番SQLで削除されたはずの `public.can_use_master_search()` は、`has_privileged_editor_tools()` を返す互換ラッパーとして実DBに存在。
- 本番の `sheet-master-autofill.js` と `troop-combo-rule-v2.js` がまだこの互換RPCを利用するため、削除しない。検証側の新コードは正規RPCへ移行。

## 適用済み変更

2026-09-06に管理接続から次のトランザクションを適用。キャストの行データは変更していない。

```sql
begin;
revoke execute on function public.can_use_master_search() from public, anon;
grant execute on function public.can_use_master_search() to authenticated;
commit;
```

匿名ユーザーが権限判定RPCを直接実行する経路を閉じ、認証済み旧クライアントの互換性を維持する。過去の36番SQLは改変しない。41番SQLに再構築用の互換ラッパー作成と権限修正を記録した。実DBでは既存ラッパーを維持し、上記の権限変更のみ適用済み。

## 継続確認

`scripts/database-invariants.sql` は8項目の読取り専用照合。すべて `passed=true` であることを確認する。ローカルの正規表現監査の成功だけで、実DBが同じ状態だと判断しない。

`npm run check:db:live` は管理API経由の同じ照合。トークン未設定・通信失敗・不一致は失敗終了する。現段階では既存CIの必須ゲートではなく、DB変更後と本番反映前に管理接続で実行する。

## 廃止条件

本番も正規RPCへ切替後、旧クライアントの利用状況を確認してから互換ラッパー廃止を別変更で行う。画像バケットは公開設定を維持し、匿名の画像共有を停止しない。
