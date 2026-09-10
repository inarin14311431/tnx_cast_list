-- Read-only checks against the deployed database; no row contents are returned.
select 'public_tables_have_rls' as check_name,
  not exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity) as passed
union all
select 'compatibility_rpc_not_anonymous',
  case when to_regprocedure('public.can_use_master_search()') is null then true
       else not has_function_privilege('anon','public.can_use_master_search()','execute') end
union all
select 'capability_rpc_authenticated_only',
  not has_function_privilege('anon','public.has_privileged_editor_tools()','execute')
  and has_function_privilege('authenticated','public.has_privileged_editor_tools()','execute')
union all
select 'save_rpc_security_invoker',
  (select count(*)=2 and bool_and(not p.prosecdef) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('save_character_bundle','save_character_bundle_with_ofc'))
union all
select 'master_policies_internal_helper',
  (select count(*)=2 and bool_and(qual='internal_security.can_use_master_search()') from pg_policies where schemaname='public' and policyname in ('skd_master_allowed_select','ofc_master_allowed_select'))
union all
select 'images_public_by_design_with_limits',
  exists (select 1 from storage.buckets where id='character-images' and public and file_size_limit=1048576 and allowed_mime_types @> array['image/jpeg','image/png','image/webp']::text[] and cardinality(allowed_mime_types)=3)
union all
select 'retired_public_id_helper_absent', to_regprocedure('public.generate_character_public_id()') is null
union all
select 'administrative_tables_not_client_writable',
  not exists (select 1 from (values ('app_administrators'),('master_search_users')) t(name) where has_table_privilege('authenticated','public.'||t.name,'INSERT,UPDATE,DELETE,TRUNCATE'));
