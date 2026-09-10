import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

test("showcase generator loads the owned showcase restore module after optional editor helpers", async () => {
  const loader = await read("js/showcase-generator-loader.js");
  assert.match(loader, /showcase-tagline\.js\?v=2/);
  assert.match(loader, /await import\("\.\/showcase-edit-restore\.js\?v=1"\)/);
});

test("owned showcase restore is owner-scoped and repopulates editable generator fields", async () => {
  const source = await read("js/showcase-edit-restore.js");
  assert.match(source, /\.from\("acts"\)/);
  assert.match(source, /\.eq\("published_by", currentUser\.id\)/);
  assert.match(source, /\.not\("showcase_data", "is", null\)/);
  assert.match(source, /supabase\.rpc\("get_owned_act_showcase_editor", \{ p_slug: slug \}\)/);
  for (const selector of ["#page-title", "#act-name", "#ruler-name", "#publish-slug", "#intro-text", "#background-url", "#selected-casts"]) {
    assert.ok(source.includes(selector), `missing restore field: ${selector}`);
  }
  assert.match(source, /data-public-character-id/);
  assert.match(source, /manualAddButton\?\.click\(\)/);
  assert.ok(source.includes('[data-field="quote"]'));
  assert.ok(source.includes('[data-field="description"]'));
  assert.ok(source.includes('[data-field="tagline"]'));
  assert.match(source, /history\.replaceState/);
});

test("editor restore RPC exposes participant identifiers only to the authenticated act owner", async () => {
  const sql = await read("supabase/43_act_showcase_editor_restore.sql");
  assert.match(sql, /get_owned_act_showcase_editor\(p_slug text\)/);
  assert.match(sql, /v_user_id uuid := auth\.uid\(\)/);
  assert.match(sql, /a\.published_by = v_user_id/);
  assert.match(sql, /'characterId', ap\.character_id/);
  assert.match(sql, /'characterPublicId', ap\.character_public_id/);
  assert.match(sql, /order by ap\.cast_order, ap\.id/);
  assert.match(sql, /revoke all on function public\.get_owned_act_showcase_editor\(text\) from public/);
  assert.match(sql, /revoke all on function public\.get_owned_act_showcase_editor\(text\) from anon/);
  assert.match(sql, /grant execute on function public\.get_owned_act_showcase_editor\(text\) to authenticated/);
});

test("migration manifest keeps editor restore before the later showcase-delete migration", async () => {
  const manifest = JSON.parse(await read("supabase/migrations-manifest.json"));
  const restoreIndex = manifest.files.indexOf("43_act_showcase_editor_restore.sql");
  const deleteIndex = manifest.files.indexOf("44_act_showcase_delete.sql");
  assert.ok(restoreIndex >= 0, "editor restore migration must stay tracked");
  assert.ok(deleteIndex > restoreIndex, "delete migration must remain appended after editor restore");
});
