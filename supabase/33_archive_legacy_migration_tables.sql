create schema if not exists internal_archive;

revoke all on schema internal_archive from public;
revoke all on schema internal_archive from anon;
revoke all on schema internal_archive from authenticated;

alter table public.character_outfits_backup_ofc_conversion_20260818 set schema internal_archive;
alter table public.character_skills_backup_mass_style_v1_converted_20260818 set schema internal_archive;
alter table public.character_skills_backup_no_skd_v1_20260818 set schema internal_archive;
alter table public.character_skills_backup_remaining_legacy_20260818 set schema internal_archive;
alter table public.character_skills_backup_style_canonical_20260825 set schema internal_archive;
alter table public.character_skills_backup_style_v1_20260818 set schema internal_archive;
alter table public.character_skills_backup_style_v1_phase2_20260818 set schema internal_archive;
alter table public.character_skills_backup_style_v1_phase3_20260818 set schema internal_archive;
alter table public.character_skills_backup_style_v1_phase4_20260818 set schema internal_archive;
alter table public.character_skills_backup_torium_nested_v1_20260818 set schema internal_archive;
alter table public.migration_style_v1_20260818 set schema internal_archive;
alter table public.migration_style_v1_no_skd_20260818 set schema internal_archive;
alter table public.migration_style_v1_phase3_20260818 set schema internal_archive;
alter table public.migration_style_v1_phase4_20260818 set schema internal_archive;

revoke all privileges on all tables in schema internal_archive from public;
revoke all privileges on all tables in schema internal_archive from anon;
revoke all privileges on all tables in schema internal_archive from authenticated;

comment on schema internal_archive is
  'Non-exposed archive for temporary migration/rollback tables. Not for application runtime access.';
