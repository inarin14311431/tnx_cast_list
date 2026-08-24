import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const aligner = await readFile(new URL("../js/armor-grand-total.js", import.meta.url), "utf8");
const tables = await readFile(new URL("../js/outfit-tables.js", import.meta.url), "utf8");

test("armor alignment helper owns layout only, not defense calculation", () => {
  assert.match(aligner, /function alignArmorLayout\(\)/);
  assert.match(aligner, /function fitArmorDescription\(table, header\)/);
  assert.match(aligner, /dataset\.ofcHead === "defense_s"/);
  assert.match(aligner, /dataset\.ofcHead === "defense_p"/);
  assert.match(aligner, /dataset\.ofcHead === "defense_i"/);
  assert.match(aligner, /label\.colSpan = Math\.max\(1, sIndex\)/);
  assert.match(aligner, /targetWidth - fixedWidth/);
  assert.match(aligner, /root\.addEventListener\("tnx:outfit-tables-rendered", queue\)/);
  assert.match(aligner, /window\.addEventListener\("resize", queue/);
  assert.doesNotMatch(aligner, /MutationObserver/);
  assert.doesNotMatch(aligner, /\[data-ofc="defense_\$\{key\}"\]|Number\(input\.value|totals\[key\]/);
});

test("outfit tables owns armor totals from canonical OFC S P I fields", () => {
  assert.match(tables, /function makeArmorFooter\(\)/);
  assert.match(tables, /function updateArmorTotals\(section\)/);
  assert.match(tables, /\[data-ofc="defense_\$\{key\}"\]/);
  assert.match(tables, /data\.armorTotal|dataset\.armorTotal|data-armor-total/);
  assert.match(tables, /\[data-ofc="defense_s"\],\[data-ofc="defense_p"\],\[data-ofc="defense_i"\]/);
  assert.doesNotMatch(tables, /data-armor-defense|dataset\.armorDefense/);
});
