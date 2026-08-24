import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/outfit-tables.js", import.meta.url), "utf8");

function rawSchemasBlock() {
  const match = source.match(/const RAW_CARD_SCHEMAS=\{([\s\S]*?)\n  \};/);
  assert.ok(match, "RAW_CARD_SCHEMAS block should exist");
  return match[1];
}

function baseLabelsBlock() {
  const match = source.match(/const BASE_LABELS=\{([\s\S]*?)\n  \};/);
  assert.ok(match, "BASE_LABELS block should exist");
  return match[1];
}

test("outfit table source distinguishes raw transport schema from canonical semantics", () => {
  assert.match(source, /const RAW_CARD_SCHEMAS=/);
  assert.match(source, /const BASE_LABELS=/);
  assert.match(source, /Canonical outfit semantics are owned by outfit-contract\.js/);
  assert.doesNotMatch(source, /const SCHEMAS=/);
  assert.doesNotMatch(source, /const LABELS=/);
});

test("raw table labels use current outfit terminology", () => {
  const labels = baseLabelsBlock();
  assert.match(labels, /concealment:'隠匿値'/);
  assert.match(labels, /control_modifier:'制御値'/);
  assert.match(labels, /cs_modifier:'CS修正'/);
  assert.match(labels, /slot:'部位'/);
  assert.doesNotMatch(labels, /mundane_modifier/);
  assert.doesNotMatch(labels, /defense:'防御'|defense_[sip]/);
});

test("reorder snapshot preserves complete raw card data before visible controls move", () => {
  assert.match(source, /function captureCardData\(card\)/);
  assert.match(source, /card\.querySelectorAll\('\[data-o\]'\)/);
  assert.match(source, /tr\._outfitTransportData=captureCardData\(card\)/);
  assert.match(source, /const data=\{\.\.\.\(row\._outfitTransportData\|\|\{\}\)\};/);
  assert.match(source, /row\.querySelectorAll\('\[data-o\]'\)/);
  assert.match(source, /items\.forEach\(item=>addRawOutfit\(item\)\)/);
});

test("raw table presentation omits retired and category-invalid compatibility cells", () => {
  const schemas = rawSchemasBlock();
  assert.doesNotMatch(schemas, /mundane_modifier/);
  assert.match(schemas, /cyberware:\['category','name','purchase_value','experience_cost','concealment','slot','description','actions'\]/);
  assert.match(schemas, /tron:\['category','name','purchase_value','experience_cost','concealment','slot','cs_modifier','description','actions'\]/);
  assert.match(schemas, /other:\['category','name','purchase_value','experience_cost','concealment','slot','description','actions'\]/);
  assert.match(schemas, /armor:\['category','name','purchase_value','experience_cost','concealment','slot','control_modifier','description','actions'\]/);
  assert.match(schemas, /vehicle:\['category','name','purchase_value','experience_cost','attack','control_modifier','cs_modifier','description','actions'\]/);
  assert.doesNotMatch(schemas, /defense/);
});

test("armor table transport no longer owns legacy defense backing", () => {
  assert.doesNotMatch(source, /card\.querySelector\('\[data-o="defense"\]'\)/);
  assert.doesNotMatch(source, /parseArmorDefense|encodeArmorDefense|armorValue|updateArmorDefense|makeArmorDefenseCell|data-armor-defense/);
  assert.match(source, /section\.querySelectorAll\(`\[data-ofc="defense_\$\{key\}"\]`\)/);
});
