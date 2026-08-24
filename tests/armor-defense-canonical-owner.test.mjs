import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const fields = await readFile(new URL("../js/outfit-ofc-fields.js", import.meta.url), "utf8");
const layout = await readFile(new URL("../js/outfit-display-rules-v5.js", import.meta.url), "utf8");
const tables = await readFile(new URL("../js/outfit-tables.js", import.meta.url), "utf8");
const save = await readFile(new URL("../js/outfit-ofc-save.js", import.meta.url), "utf8");

test("armor S P I editor fields are canonical OFC detail controls", () => {
  assert.match(fields, /armor:\s*\[\.\.\.COMMON_FIELDS,\s*"defense_s",\s*"defense_p",\s*"defense_i",\s*"electronic_control"\]/);
  assert.match(layout, /\["ofc","defense_s","S"\],\["ofc","defense_p","P"\]/);
  assert.match(layout, /\["ofc","defense_i","I"\]/);
  assert.doesNotMatch(layout, /\["base","defense_s","S"\]/);
  assert.doesNotMatch(layout, /\["base","defense_p","P"\]/);
  assert.doesNotMatch(layout, /\["base","defense_i","I"\]/);
});

test("armor detail collection reads canonical OFC S P I only", () => {
  assert.match(fields, /row\.querySelector\('\[data-ofc="defense_s"\]'\)\?\.value \|\| details\.defense_s/);
  assert.match(fields, /row\.querySelector\('\[data-ofc="defense_p"\]'\)\?\.value \|\| details\.defense_p/);
  assert.match(fields, /row\.querySelector\('\[data-ofc="defense_i"\]'\)\?\.value \|\| details\.defense_i/);
  assert.doesNotMatch(fields, /parseDefense/);
});

test("legacy armor defense backing bridge is retired from active editing", () => {
  assert.doesNotMatch(layout, /syncArmorDefenseBridge|syncArmorDefenseRow|data-armor-defense/);
  assert.doesNotMatch(tables, /parseArmorDefense|encodeArmorDefense|armorValue|updateArmorDefense|makeArmorDefenseCell|data-armor-defense/);
  assert.match(tables, /\[data-ofc="defense_\$\{key\}"\]/);
});

test("current DB detail loading no longer reconstructs combined defense", () => {
  assert.match(fields, /\.select\("category,name,sort_order,ofc_details"\)/);
  assert.match(fields, /return normalizeDetails\(row\?\.ofc_details \|\| \{\}\)/);
  assert.doesNotMatch(fields, /row\?\.defense|parseLegacyDescription/);
  assert.match(save, /defense: ""/);
  assert.doesNotMatch(save, /composeDefense|data-armor-defense|parseDefense/);
});
