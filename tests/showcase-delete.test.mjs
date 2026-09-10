import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const guestSchema = await readFile(new URL("../supabase/42_act_showcase_guests.sql", import.meta.url), "utf8");
const sql = await readFile(new URL("../supabase/46_act_showcase_delete_public_url.sql", import.meta.url), "utf8");
const client = await readFile(new URL("../js/showcase-delete.js", import.meta.url), "utf8");
const loader = await readFile(new URL("../js/showcase-generator-loader.js", import.meta.url), "utf8");

test("ACT SHOWCASE deletion follows the canonical guest-table columns", () => {
  assert.match(guestSchema, /owner_id uuid not null/i);
  assert.match(guestSchema, /showcase_slug text not null/i);
  assert.match(sql, /g\.showcase_slug = v_slug/i);
  assert.match(sql, /g\.owner_id = v_user_id/i);
  assert.doesNotMatch(sql, /g\.act_slug/i);
  assert.doesNotMatch(sql, /g\.published_by/i);
});

test("ACT SHOWCASE deletion is owner-scoped and preserves ACT history", () => {
  assert.match(sql, /where a\.slug = v_slug\s+and a\.published_by = v_user_id\s+and a\.showcase_data is not null/i);
  assert.match(sql, /showcase_data = null/);
  assert.match(sql, /showcase_public = false/);
  assert.match(sql, /showcase_updated_at = null/);
  assert.match(sql, /public_url = ''/);
  assert.doesNotMatch(sql, /public_url = null/);
  assert.doesNotMatch(sql, /delete from public\.acts/i);
  assert.doesNotMatch(sql, /delete from public\.act_participants/i);
  assert.doesNotMatch(sql, /grant execute[^;]+to anon/i);
  assert.match(sql, /grant execute on function public\.delete_owned_act_showcase\(text\) to authenticated/i);
});

test("editor exposes an explicit confirmed delete action and keeps local form contents", () => {
  assert.match(loader, /showcase-delete\.js\?v=1/);
  assert.match(client, /id = "delete-owned-showcase"/);
  assert.match(client, /window\.confirm/);
  assert.match(client, /supabase\.rpc\("delete_owned_act_showcase", \{ p_slug: slug \}\)/);
  assert.match(client, /アクト履歴と参加履歴は残ります/);
  assert.match(client, /現在の編集欄はそのまま残している/);
});
