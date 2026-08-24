import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/sheet-mobile-outfit.js", import.meta.url), "utf8");
const model = await readFile(new URL("../js/sheet-mobile-outfit-model.js", import.meta.url), "utf8");
const ui = await readFile(new URL("../js/sheet-mobile-outfit-ui.js", import.meta.url), "utf8");

test("mobile outfit uses shared editor context instead of independent auth lookup", () => {
  assert.match(source, /getMobileEditorContext/);
  assert.doesNotMatch(source, /requireAuth/);
  assert.doesNotMatch(source, /from\(["']characters["']\)/);
});

test("mobile outfit keeps save coordinator contract", () => {
  assert.match(source, /tnx:mobile-before-save/);
  assert.match(source, /character_outfits/);
});

test("mobile outfit keeps category rules in model and UI owners", () => {
  assert.match(model, /RANGE_OPTIONS/);
  assert.match(model, /SLOT_OPTIONS/);
  assert.match(model, /CONTROL_OPTIONS/);
  assert.match(model, /function parseConcealment/);
  assert.match(model, /function parseDefense/);
  assert.match(ui, /function performanceFields/);
  assert.match(ui, /case "armor"/);
  assert.match(ui, /case "tron"/);
  assert.match(ui, /case "vehicle"/);
});

test("mobile outfit groups common, performance, and description fields by responsibility", () => {
  const baseBlock = ui.match(/function commonBaseFields[\s\S]*?^}\n/m)?.[0] || "";
  const concealBlock = ui.match(/function concealFields[\s\S]*?^}\n/m)?.[0] || "";
  const descriptionBlock = ui.match(/function descriptionFields[\s\S]*?^}\n/m)?.[0] || "";
  const performanceBlock = ui.match(/function performanceFields[\s\S]*?^}\n/m)?.[0] || "";

  for (const token of ["名称", "購入", "常備化"]) assert.match(baseBlock, new RegExp(token));
  assert.match(baseBlock, /concealFields\(item\)/);
  assert.match(baseBlock, /slotField\(item\)/);
  assert.match(concealBlock, /<label>隠匿<input/);
  assert.match(concealBlock, /隠匿修正/);
  assert.match(ui, /const slotField = item => `<label>部位/);
  assert.match(descriptionBlock, /解説/);
  assert.match(descriptionBlock, /page_number/);
  assert.match(descriptionBlock, /参照P/);
  assert.doesNotMatch(baseBlock, /page_number|参照P/);
  assert.doesNotMatch(performanceBlock, /page_number|参照P|description/);
  assert.doesNotMatch(ui, /<legend>追加情報<\/legend>/);
  assert.doesNotMatch(ui, /メーカー/);
});

test("mobile outfit persists split concealment and consumes legacy modifier aliases", () => {
  assert.match(model, /concealment_penalty:/);
  assert.match(model, /normalizeOutfitDetailCompatibility/);
  assert.match(model, /splitLegacyConcealment/);
  assert.doesNotMatch(model, /return mod \? `\$\{value\}\/\$\{mod\}` : value/);
  assert.doesNotMatch(source, /ofc_details\.control_value\s*=/);
  assert.doesNotMatch(model, /detailsSource\.control_value\s*=/);
});

test("mobile outfit reads old combined defense but never re-emits it", () => {
  assert.match(model, /parseLegacyDefense/);
  assert.match(model, /defense:\s*""/);
  assert.doesNotMatch(model, /function composeDefense/);
  assert.match(model, /defense_s:/);
  assert.match(model, /defense_p:/);
  assert.match(model, /defense_i:/);
});

test("mobile outfit does not generate retired mundane_modifier", () => {
  const blankBlock = model.match(/export function blankOutfit\(\)[\s\S]*?^}\n/m)?.[0] || "";
  const collectBlock = model.match(/export function collectOutfitRecord\([\s\S]*$/m)?.[0] || "";
  assert.doesNotMatch(blankBlock, /mundane_modifier/);
  assert.doesNotMatch(collectBlock, /mundane_modifier:/);
  assert.match(model, /delete draft\.mundane_modifier/);
});
