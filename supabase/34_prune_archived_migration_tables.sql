drop table if exists internal_archive.character_skills_backup_mass_style_v1_converted_20260818;
drop table if exists internal_archive.character_skills_backup_no_skd_v1_20260818;
drop table if exists internal_archive.character_skills_backup_remaining_legacy_20260818;
drop table if exists internal_archive.character_skills_backup_style_v1_20260818;
drop table if exists internal_archive.character_skills_backup_style_v1_phase2_20260818;
drop table if exists internal_archive.character_skills_backup_style_v1_phase3_20260818;
drop table if exists internal_archive.character_skills_backup_style_v1_phase4_20260818;
drop table if exists internal_archive.character_skills_backup_torium_nested_v1_20260818;
drop table if exists internal_archive.migration_style_v1_20260818;
drop table if exists internal_archive.migration_style_v1_no_skd_20260818;
drop table if exists internal_archive.migration_style_v1_phase3_20260818;
drop table if exists internal_archive.migration_style_v1_phase4_20260818;

alter table internal_archive.character_skills_backup_style_canonical_20260825 disable row level security;
alter table internal_archive.character_outfits_backup_ofc_conversion_20260818 disable row level security;

comment on table internal_archive.character_skills_backup_style_canonical_20260825 is
  'Temporary rollback anchor for canonical style-skill migration. Internal-only; review for deletion after rollback window.';
comment on table internal_archive.character_outfits_backup_ofc_conversion_20260818 is
  'Temporary rollback anchor for OFC conversion. Internal-only; review for deletion after rollback window.';

revoke all privileges on all tables in schema internal_archive from public;
revoke all privileges on all tables in schema internal_archive from anon;
revoke all privileges on all tables in schema internal_archive from authenticated;
