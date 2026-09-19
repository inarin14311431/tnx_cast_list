-- Stage 1 of retiring the public.can_use_master_search() compatibility wrapper.
--
-- Relationship to migration 41 (41_reconcile_compatibility_rpc_access.sql):
-- migration 41 recreated this wrapper (which just calls
-- public.has_privileged_editor_tools()) and granted EXECUTE to `authenticated`
-- because legacy production clients were still calling it directly instead of
-- the canonical RPC.
--
-- 2026-09-18 edge_logs investigation (see docs/DB_RECONCILIATION_20260918.md):
-- calls to public.can_use_master_search() dropped to zero starting 2026-09-11
-- and have stayed at zero through the most recent 24h window, while
-- public.has_privileged_editor_tools() continued to receive normal
-- (hundreds-to-thousands/day) traffic over the same period, confirming log
-- collection itself was working and the drop reflects client migration, not a
-- logging gap. A repository search of both the verification and production
-- client codebases found no remaining references to can_use_master_search().
--
-- This migration is REVOKE-only: it does NOT drop the function, and it does
-- NOT change service_role's access. Dropping the function outright is
-- deferred to a follow-up migration once the checklist in
-- docs/DB_RECONCILIATION_20260918.md is satisfied.
begin;

revoke execute on function public.can_use_master_search() from authenticated;

notify pgrst, 'reload schema';

commit;
