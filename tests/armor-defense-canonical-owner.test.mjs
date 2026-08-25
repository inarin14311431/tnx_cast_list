import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const normalization = await readFile(new URL("../js/sheet-load-normalization.js", import.meta.url), "utf8");
const renderer = await readFile(new URL("../js/sheet-outfit-renderer.js", import.meta.url), "utf8");
const fields = await readFile(new URL("../js/outfit-ofc-fields.js", import.meta.url), "utf8");
const layout = await readFile(new URL("../js/outfit-display-rules-v5.js", import.meta.url), "utf8");
const tables = await readFile(new URL("../js/outfit-tables.js", import.meta.url), "utf8");
const save = await readFile(new URL("../js/outfit-ofc-save.js", import.meta.url), "utf8");

test("armor S P I are flattened into the canonical editor model before rendering", () => {
  assert.match(normalization, /normalizeImportedOutfitDetails\(category, outfit\.ofc_details \|\| \{\}\)/);
  assert.match(normalization, /defense_s:\s*""/);
  assert.match(normalization, /defense_p:\s*""/);
  assert.match(normalization, /defense_i:\s*""/);
  assert.match(renderer, /armor:\s*\[[\s\S]*field\(outfit, "defense_s", "S"\)[\s\S]*field\(outfit, "defense_p", "P"\)[\s\S]*field\(outfit, "defense_i", "I"\)/);
  assert.match(layout, /\["ofc","defense_s","S"\],\["ofc","defense_p","P"\]/);
  assert.match(layout, /\["ofc","defense_i","I"\]/);
});

test("armor table owns canonical OFC S P I cells from its first render", () => {
  assert.match(tables, /armor:\['category'[\s\S]*'defense_s','defense_p','defense_i'/);
  assert.match(tables, /td\.dataset\.ofcCell=key/);
  assert.match(tables, /th\.dataset\.ofcHead=key/);
  assert.doesNotMatch(tables, /parseArmorDefense|encodeArmorDefense|data-armor-defense/);
});

test("armor detail collection reads canonical OFC S P I only", () => {
  assert.match(fields, /row\.querySelector\('\[data-ofc="defense_s"\]'\)\?\.value \|\| details\.defense_s/);
  assert.match(fields, /row\.querySelector\('\[data-ofc="defense_p"\]'\)\?\.value \|\| details\.defense_p/);
  assert.match(fields, /row\.querySelector\('\[data-ofc="defense_i"\]'\)\?\.value \|\| details\.defense_i/);
  assert.doesNotMatch(fields, /parseDefense|from\(["']character_outfits["']\)|supabase/);
});

test("current armor flow never reconstructs or saves combined defense", () => {
  assert.doesNotMatch(normalization, /parseLegacyDescription|composeDefense/);
  assert.match(save, /defense: ""/);
  assert.doesNotMatch(save, /composeDefense|data-armor-defense|parseDefense/);
});
