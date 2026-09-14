import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const migration = await readFile(
  new URL("../supabase/migrations/20260914_random_public_id.sql", import.meta.url),
  "utf8"
);

test("new cast public IDs use 128-bit cryptographic randomness", () => {
  assert.match(migration, /create or replace function internal_security\.generate_character_public_id\(\)/i);
  assert.match(migration, /extensions\.gen_random_bytes\(16\)/i);
  assert.match(migration, /'TNX-'\s*\|\|\s*upper\(encode\(/i);
  assert.doesNotMatch(migration, /nextval\s*\(/i);
});

test("random public ID migration preserves existing cast URLs", () => {
  assert.doesNotMatch(migration, /update\s+public\.characters/i);
  assert.doesNotMatch(migration, /delete\s+from\s+public\.characters/i);
  assert.match(
    migration,
    /alter table public\.characters[\s\S]*alter column public_id set default internal_security\.generate_character_public_id\(\)/i
  );
});

test("public ID generator remains internal and least-privilege", () => {
  assert.match(migration, /security definer/i);
  assert.match(migration, /set search_path = pg_catalog, public, pg_temp/i);
  assert.match(migration, /revoke all on function internal_security\.generate_character_public_id\(\) from public, anon/i);
  assert.match(migration, /grant execute on function internal_security\.generate_character_public_id\(\) to authenticated, service_role/i);
});

test("archive display formatter accepts the new random source ID shape", async () => {
  const formatter = await readFile(new URL("../js/archive-id-code.js", import.meta.url), "utf8");
  const context = { window: {} };
  vm.runInNewContext(formatter, context);
  const sourceId = "TNX-0123456789ABCDEF0123456789ABCDEF";
  const displayId = context.window.TNXArchiveId.format(sourceId);
  assert.match(displayId, /^TNX-[23456789A-HJ-NP-Z]{4}-[23456789A-HJ-NP-Z]{4}$/);
  assert.equal(displayId, context.window.TNXArchiveId.format(sourceId));
});
