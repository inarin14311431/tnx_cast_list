import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/outfit-tables.js", import.meta.url), "utf8");

function schemasBlock() {
  const match = source.match(/const RAW_CARD_SCHEMAS=\{([\s\S]*?)\n  \};/);
  assert.ok(match, "RAW_CARD_SCHEMAS block should exist");
  return match[1];
}

function labelsBlock() {
  const match = source.match(/const BASE_LABELS=\{([\s\S]*?)\n  \};/);
  assert.ok(match, "BASE_LABELS block should exist");
  return match[1];
}

test("outfit table converts complete canonical cards without adding semantic fields", () => {
  assert.match(source, /Convert complete outfit cards into category-specific tables/);
  assert.match(source, /const RAW_CARD_SCHEMAS=/);
  assert.match(source, /const OFC_FIELDS=new Set/);
  assert.doesNotMatch(source, /createElement\(['"]input['"]\)/);
});

test("table labels use current canonical outfit terminology", () => {
  const labels = labelsBlock();
  assert.match(labels, /concealment:'隠匿値'/);
  assert.match(labels, /concealment_penalty:'隠匿修正'/);
  assert.match(labels, /defense_s:'S',defense_p:'P',defense_i:'I'/);
  assert.match(labels, /control_modifier:'制御値'/);
  assert.match(labels, /cs_modifier:'CS修正'/);
  assert.doesNotMatch(labels, /mundane_modifier|defense:'防御'/);
});

test("reorder snapshot preserves every rendered canonical control", () => {
  assert.match(source, /function captureCardData\(card\)/);
  assert.match(source, /card\.querySelectorAll\('\[data-o\]'\)/);
  assert.match(source, /tr\._outfitTransportData=captureCardData\(card\)/);
  assert.match(source, /row\.querySelectorAll\('\[data-o\]'\)/);
  assert.match(source, /items\.forEach\(item=>addRawOutfit\(item\)\)/);
});

test("category table schemas contain their canonical OFC fields from first render", () => {
  const schemas = schemasBlock();
  assert.doesNotMatch(schemas, /mundane_modifier|control_value|cs_value/);
  assert.match(schemas, /armor:\[[^\n]*'defense_s','defense_p','defense_i','control_modifier','electronic_control'/);
  assert.match(schemas, /cyberware:\[[^\n]*'electronic_control','ianus_surface','ianus_deep','ianus_none'/);
  assert.match(schemas, /tron:\[[^\n]*'electronic_control','speed','tron_software','tron_support','tron_hardware','cs_modifier'/);
  assert.match(schemas, /vehicle:\[[^\n]*'control_modifier','cs_modifier','electronic_control','defense_s','defense_p','defense_i','crew','sf'/);
  assert.match(schemas, /residence:\[[^\n]*'residence_entry','residence_electric','residence_area'/);
});

test("canonical OFC cells are identified for the layout controller", () => {
  assert.match(source, /td\.dataset\.ofcCell=key/);
  assert.match(source, /th\.dataset\.ofcHead=key/);
  assert.match(source, /section\.querySelectorAll\(`\[data-ofc="defense_\$\{key\}"\]`\)/);
  assert.doesNotMatch(source, /parseArmorDefense|encodeArmorDefense|data-armor-defense/);
});
