import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const client = read("js/supabase-client.js");
const login = read("js/login.js");
const backup = read("js/backup.js");
const accountDelete = read("js/account-delete.js");
const deleteFn = read("supabase/functions/delete-account/index.ts");
const adminFn = read("supabase/functions/master-auth-users/index.ts");
const actPublishSecurityMigration = read("supabase/11_showcase_publish_security.sql");
const actReadMigration = read("supabase/30_owner_scoped_act_reads.sql");
const privilegedGateMigration = read("supabase/31_privileged_editor_capability_gate.sql");
const storageLimitMigration = read("supabase/32_character_image_upload_limits.sql");
const archiveMigration = read("supabase/33_archive_legacy_migration_tables.sql");
const pruneArchiveMigration = read("supabase/34_prune_archived_migration_tables.sql");
const troopsGrantMigration = read("supabase/35_least_privilege_troops_grants.sql");
const internalSecurityMigration = read("supabase/36_hide_internal_security_helpers.sql");

assert(
  !/service[_-]?role/i.test(client),
  "Browser Supabase client must not contain a service-role credential."
);
assert(
  !/SUPABASE_SERVICE_ROLE_KEY/.test(client),
  "Service-role environment name must not be referenced by browser client code."
);
assert(
  /candidate\.origin\s*===\s*window\.location\.origin/.test(login),
  "Login return URL must remain same-origin restricted."
);
assert(
  /candidate\.pathname\.startsWith\(SITE_BASE_PATH\)/.test(login),
  "Login return URL must remain inside the application base path."
);
assert(
  /MAX_BACKUP_BYTES/.test(backup) &&
    /MAX_CASTS/.test(backup) &&
    /MAX_RELATED_ROWS/.test(backup),
  "Backup import safety limits are missing."
);
assert(
  /character\.owner_id\s*=\s*user\.id/.test(backup),
  "Backup restore must force ownership to the authenticated user."
);
assert(
  /character\.visibility\s*=\s*"private"/.test(backup),
  "Backup restore must force restored casts to private."
);
assert(
  /getUser\(token\)/.test(deleteFn),
  "Self-delete Edge Function must validate the bearer token with Supabase Auth."
);
assert(
  /signInWithPassword/.test(deleteFn),
  "Self-delete Edge Function must verify the password server-side."
);
assert(
  /password/.test(accountDelete) && /confirmation:\s*"DELETE"/.test(accountDelete),
  "Self-delete client must send password and explicit DELETE confirmation."
);
assert(
  /SUPABASE_SERVICE_ROLE_KEY/.test(deleteFn),
  "Self-delete administrative client must obtain service-role from environment."
);
assert(
  !/PRIMARY_ADMIN_USER_ID|PRIMARY_ADMIN_EMAIL/.test(adminFn),
  "Administrator identity must not be hard-coded in the Edge Function."
);
assert(
  /app_administrators/.test(adminFn) && /requireAdministrator/.test(adminFn),
  "Auth administration must use the protected administrator table."
);
assert(
  /SUPABASE_SERVICE_ROLE_KEY/.test(adminFn),
  "Auth administration service-role must come from environment."
);
assert(
  /create or replace function public\.record_act_publication[\s\S]*security definer/i.test(actPublishSecurityMigration) &&
    /v_existing_publisher is distinct from p_published_by/i.test(actPublishSecurityMigration),
  "Act publication RPC must keep its publisher ownership guard."
);
assert(
  /revoke all on function public\.record_act_publication\([^;]+\) from public/i.test(actPublishSecurityMigration) &&
    /grant execute on function public\.record_act_publication\([^;]+\) to service_role/i.test(actPublishSecurityMigration),
  "Act publication RPC must remain service-role only."
);
assert(
  /create policy act_participants_select_owner[\s\S]*c\.owner_id\s*=\s*auth\.uid\(\)/i.test(actReadMigration),
  "Act participation SELECT policy must remain scoped to the current character owner."
);
assert(
  /create policy acts_select_owner_scope[\s\S]*published_by\s*=\s*auth\.uid\(\)[\s\S]*c\.owner_id\s*=\s*auth\.uid\(\)/i.test(actReadMigration),
  "Act SELECT policy must remain scoped to the publisher or an owned participation."
);
assert(
  !/create policy\s+(?:act_participants_select_authenticated|acts_select_authenticated)[\s\S]*using\s*\(\s*true\s*\)/i.test(actReadMigration),
  "Act history SELECT policies must not restore authenticated-wide reads."
);
assert(
  /create or replace function public\.has_privileged_editor_tools\(\)[\s\S]*auth\.uid\(\) is not null[\s\S]*master_search_users/i.test(privilegedGateMigration),
  "Privileged editor capability must remain authenticated and allowlist-backed."
);
assert(
  /revoke all on function public\.has_privileged_editor_tools\(\) from public, anon/i.test(privilegedGateMigration) &&
    /grant execute on function public\.has_privileged_editor_tools\(\) to authenticated/i.test(privilegedGateMigration),
  "Privileged editor capability RPC must not be executable by anonymous users."
);
assert(
  /where id\s*=\s*'character-images'/i.test(storageLimitMigration),
  "Character image upload limits must target only the character-images bucket."
);
assert(
  /file_size_limit\s*=\s*1048576/i.test(storageLimitMigration),
  "Character image bucket must keep a 1 MiB server-side upload limit."
);
assert(
  /allowed_mime_types\s*=\s*array\['image\/jpeg',\s*'image\/png',\s*'image\/webp'\]::text\[\]/i.test(storageLimitMigration),
  "Character image bucket must restrict uploads to JPEG, PNG, and WebP."
);
assert(
  !/public\s*=\s*(?:true|false)/i.test(storageLimitMigration),
  "Storage upload limit migration must not change the bucket public/private design decision."
);
assert(
  /create schema if not exists internal_archive/i.test(archiveMigration),
  "Legacy rollback data must be moved to a non-public archive schema."
);
assert(
  /revoke all on schema internal_archive from anon/i.test(archiveMigration) &&
    /revoke all on schema internal_archive from authenticated/i.test(archiveMigration),
  "Archive schema must remain unavailable to normal application roles."
);
assert(
  /alter table public\.character_skills_backup_style_canonical_20260825 set schema internal_archive/i.test(archiveMigration) &&
    /alter table public\.character_outfits_backup_ofc_conversion_20260818 set schema internal_archive/i.test(archiveMigration),
  "Final rollback anchors must leave the public schema."
);
assert(
  (pruneArchiveMigration.match(/drop table if exists internal_archive\./gi) || []).length >= 12,
  "Intermediate migration and backup tables must remain pruned from the archive."
);
assert(
  /revoke all privileges on all tables in schema internal_archive from anon/i.test(pruneArchiveMigration) &&
    /revoke all privileges on all tables in schema internal_archive from authenticated/i.test(pruneArchiveMigration),
  "Archived rollback tables must remain inaccessible to normal application roles."
);
assert(
  /revoke\s+truncate\s*,\s*references\s*,\s*trigger\s+on\s+table\s+public\.troops\s+from\s+authenticated/i.test(troopsGrantMigration),
  "Authenticated troops access must not include TRUNCATE, REFERENCES, or TRIGGER privileges."
);
assert(
  !/revoke[\s\S]*(?:select|insert|update|delete)[\s\S]*public\.troops/i.test(troopsGrantMigration),
  "Least-privilege troops migration must preserve the CRUD privileges used by the app."
);
assert(
  /create schema if not exists internal_security/i.test(internalSecurityMigration) &&
    /revoke all on schema internal_security from public, anon, authenticated/i.test(internalSecurityMigration),
  "Internal SECURITY DEFINER helpers must remain outside the exposed public schema."
);
assert(
  /drop function if exists public\.can_use_master_search\(\)/i.test(internalSecurityMigration) &&
    /drop function if exists public\.generate_character_public_id\(\)/i.test(internalSecurityMigration),
  "Retired public SECURITY DEFINER helpers must stay removed."
);
assert(
  /alter policy skd_master_allowed_select[\s\S]*internal_security\.can_use_master_search\(\)/i.test(internalSecurityMigration) &&
    /alter policy ofc_master_allowed_select[\s\S]*internal_security\.can_use_master_search\(\)/i.test(internalSecurityMigration),
  "Master data RLS must continue using the internal capability helper."
);

if (failures.length) {
  console.error("Security audit failed:");
  failures.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

console.log("Security audit passed.");
