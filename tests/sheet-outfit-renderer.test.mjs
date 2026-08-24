import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { renderOutfitEditor } from "../js/sheet-outfit-renderer.js";

const outfit = (overrides = {}) => ({
  _key: "outfit-1",
  category: "other",
  name: "装備",
  purchase_value: "10",
  experience_cost: 3,
  concealment: "12",
  attack: "+4",
  range: "近",
  slot: "片手",
  description: "解説",
  control_modifier: -1,
  cs_modifier: 2,
  ...overrides
});

function fields(html) {
  return [...html.matchAll(/data-o="([^"]+)"/g)].map(match => match[1]);
}

test("outfit renderer preserves empty and raw card contracts", () => {
  assert.equal(renderOutfitEditor([]), "<p>アウトフィット未登録</p>");

  const html = renderOutfitEditor([outfit({ _key: "other-1" })]);
  assert.match(html, /^<article class="outfit-card outfit-form" data-outfit-key="other-1">/);
  assert.match(html, /data-delete-outfit="other-1"/);
  assert.match(html, /<option value="other" selected>その他<\/option>/);
  assert.deepEqual(fields(html), [
    "category", "name", "purchase_value", "experience_cost", "concealment", "slot", "description"
  ]);
});

test("outfit renderer preserves category-specific raw control schemas", () => {
  const cases = [
    ["weapon", ["category", "name", "purchase_value", "experience_cost", "concealment", "attack", "range", "slot", "description"]],
    ["armor", ["category", "name", "purchase_value", "experience_cost", "concealment", "slot", "control_modifier", "description"]],
    ["cyberware", ["category", "name", "purchase_value", "experience_cost", "concealment", "slot", "description"]],
    ["tron", ["category", "name", "purchase_value", "experience_cost", "concealment", "slot", "cs_modifier", "description"]],
    ["vehicle", ["category", "name", "purchase_value", "experience_cost", "attack", "control_modifier", "cs_modifier", "description"]],
    ["residence", ["category", "name", "purchase_value", "experience_cost", "slot", "description"]],
    ["other", ["category", "name", "purchase_value", "experience_cost", "concealment", "slot", "description"]]
  ];

  for (const [category, expected] of cases) {
    const html = renderOutfitEditor([outfit({ _key: category, category })]);
    assert.deepEqual(fields(html), expected, category);
  }
});

test("outfit renderer keeps numeric controls and escapes user values", () => {
  const html = renderOutfitEditor([outfit({
    _key: "armor-1",
    category: "armor",
    name: "<防具>",
    description: "A&B",
    experience_cost: 7,
    control_modifier: -2
  })]);

  assert.match(html, /value="&lt;防具&gt;"/);
  assert.match(html, /value="A&amp;B"/);
  assert.match(html, /data-o="experience_cost" type="number" value="7"/);
  assert.match(html, /data-o="control_modifier" type="number" value="-2"/);
});

test("classic sheet delegates outfit markup to the renderer module", async () => {
  const source = await readFile(new URL("../js/sheet.js", import.meta.url), "utf8");
  assert.match(source, /renderOutfitEditor\(outfits\)/);
  assert.doesNotMatch(source, /function\s+outfitFields\s*\(/);
  assert.doesNotMatch(source, /const\s+OUTFIT_LABELS\s*=/);
  assert.match(source, /function\s+renderOutfits\s*\(\)\s*\{\s*\$\("#outfit-list"\)\.innerHTML\s*=\s*renderOutfitEditor\(outfits\);\s*\}/s);
});
