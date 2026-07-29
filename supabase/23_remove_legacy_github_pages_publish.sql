-- 23: 旧GitHub Pages公開機能のDB側RPCを削除する。
-- 依存: 20_dynamic_act_showcase.sql
--
-- 現在のアクト紹介は showcase_data をSupabaseへ保存し、
-- act-showcase.html が動的に表示する方式へ移行済み。
-- record_act_publication は旧 publish-showcase Edge Function専用のため削除する。

begin;

drop function if exists public.record_act_publication(
  text,
  text,
  text,
  text,
  uuid,
  uuid[]
);

notify pgrst, 'reload schema';
commit;

-- Edge FunctionとSecretはSQLから削除できないため、必要に応じて別途実行する。
--
-- supabase functions delete publish-showcase --project-ref koprmbkoftuuffslhsvt
-- supabase secrets unset GITHUB_SHOWCASE_TOKEN --project-ref koprmbkoftuuffslhsvt
-- supabase secrets unset GITHUB_SHOWCASE_REPOSITORY --project-ref koprmbkoftuuffslhsvt
-- supabase secrets unset GITHUB_SHOWCASE_BRANCH --project-ref koprmbkoftuuffslhsvt
-- supabase secrets unset GITHUB_SHOWCASE_PAGES_BASE --project-ref koprmbkoftuuffslhsvt
-- supabase secrets unset SHOWCASE_ALLOWED_ORIGINS --project-ref koprmbkoftuuffslhsvt
-- supabase secrets unset SHOWCASE_ADMIN_USER_IDS --project-ref koprmbkoftuuffslhsvt
-- supabase secrets unset SHOWCASE_ADMIN_EMAILS --project-ref koprmbkoftuuffslhsvt
