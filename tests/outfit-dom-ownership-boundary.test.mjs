import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const tables = await readFile(new URL("../js/outfit-tables.js", import.meta.url), "utf8");
const armorAligner = await readFile(new URL("../js/armor-grand-total.js", import.meta.url), "utf8");
const multiline = await readFile(new URL("../js/sheet-multiline-fields-v3.js", import.meta.url), "utf8");
const autofill = await readFile(new URL("../js/sheet-master-autofill.js", import.meta.url), "utf8");
const features = await readFile(new URL("../js/sheet-features.js", import.meta.url), "utf8");

test("outfit tables own armor defense calculation while alignment helper owns footer placement only", () => {
  assert.match(tables, /function updateArmorTotals\(section\)/);
  assert.match(tables, /data-armor-total/);
  assert.match(armorAligner, /function alignArmorLayout\(\)/);
  assert.match(armorAligner, /dataset\.ofcHead === "defense_s"/);
  assert.doesNotMatch(armorAligner, /\[data-ofc="defense_\$\{key\}"\]|Number\(input\.value|totals\[key\]/);
});

test("outfit tables publish an explicit post-render completion event", () => {
  assert.match(tables, /RENDER_EVENT='tnx:outfit-tables-rendered'/);
  assert.match(tables, /function notifyRendered\(\)/);
  assert.match(tables, /root\.dispatchEvent\(new CustomEvent\(RENDER_EVENT/);
  assert.match(tables, /root\.replaceChildren\(fragment\);\s*notifyRendered\(\);/);
});

test("multiline outfit enhancement consumes render completion instead of observing outfit DOM", () => {
  assert.match(multiline, /OUTFIT_RENDER_EVENT="tnx:outfit-tables-rendered"/);
  assert.match(multiline, /outfitRoot\?\.addEventListener\(OUTFIT_RENDER_EVENT,queue\)/);
  assert.doesNotMatch(multiline, /new MutationObserver\(queue\)\.observe\(outfitRoot/);
  assert.doesNotMatch(multiline, /outfitRoot&&new MutationObserver/);
  assert.match(multiline, /window\.TNXMultilineFields=\{enhance,queue,normalize,setStyleNameExact\}/);
});

test("remaining outfit root responsibilities stay action scoped or structural", () => {
  assert.match(tables, /document\.querySelector\('#outfit-list'\)/);
  assert.match(multiline, /const outfitRoot=document\.querySelector\("#outfit-list"\)/);
  assert.match(autofill, /document\.querySelectorAll\("#outfit-list \[data-outfit-key\]"\)/);
  assert.doesNotMatch(autofill, /MutationObserver/);
  assert.doesNotMatch(features, /#outfit-list/);
});
