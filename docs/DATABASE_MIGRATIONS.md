# Database migration policy

`supabase/migrations-manifest.json` is the repository-side migration history contract.

## Rules

- Applied SQL migration files are immutable: do not rename, reorder, delete, or edit them as a cleanup operation.
- Historical duplicate numeric prefixes are intentionally preserved. Their relative order is fixed by the manifest.
- A new migration uses a new highest numeric prefix, is appended to the manifest, and is reviewed together with the application change that requires it.
- Corrective database changes are added as a new migration rather than rewriting an older migration.
- `npm run audit:migrations` verifies that every top-level `supabase/*.sql` migration is tracked and that the manifest never moves backward numerically.

This manifest records repository migration order; actual Supabase deployment state must still be checked before applying a database change.

## Live state reconciliation

The manifest is not a deployment ledger. Run `scripts/database-invariants.sql` against the deployed database after DB changes. See `archive/DB_RECONCILIATION_20260906.md` for the applied compatibility-RPC grant correction and why the old public helper remained until production clients migrated. Do not rerun historical migration 36 as a cleanup operation.

`archive/DB_RECONCILIATION_20260918.md` records the 2026-09-18 edge_logs investigation confirming `public.can_use_master_search()` had received zero calls for a full week and that no client code (verification or production) still references it. `47_revoke_legacy_master_search_client_access.sql` is stage 1 of retiring the helper: it revokes `authenticated`'s EXECUTE privilege only. It does not drop the function and does not change `service_role` access, and dropping the function is deferred to a follow-up migration once the checklist in `archive/DB_RECONCILIATION_20260918.md` is satisfied. As of this migration's authoring, it has been committed to the repository but not yet applied to the live `koprmbkoftuuffslhsvt` project — live application requires separate explicit approval.
