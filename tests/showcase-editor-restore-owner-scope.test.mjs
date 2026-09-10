import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sql = await readFile(new URL("../supabase/43_act_showcase_editor_restore.sql", import.meta.url), "utf8");

test("showcase editor restore cannot load another publisher's act", () => {
  assert.match(sql, /where a\.slug = p_slug\s+and a\.published_by = v_user_id/);
  assert.match(sql, /raise exception 'Owned act showcase was not found\.'/);
  assert.doesNotMatch(sql, /grant execute[^;]+to anon/i);
});
