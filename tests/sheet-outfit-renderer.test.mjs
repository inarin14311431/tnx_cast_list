import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { renderOutfitEditor } from "../js/sheet-outfit-renderer.js";

const outfit = (overrides = {}) => ({
  _key: "outfit-1", category: "other", name: "装備", purchase_value: "10", experience_cost: 3,
  concealment: "12", concealment_penalty: "-1", attack: "+4", parry: "1", range: "近", speed: "2",
  electronic_control: "15", defense_s: "3", defense_p: "4", defense_i: "5", slot: "片手",
  manufacturer: "メーカー", page_number: "123", description: "解説", control_modifier: -1, cs_modifier: 2,
  _ofc_details: {}, ...overrides
});

function fields(html) {
  return [...html.matchAll(/data-o="([^"]+)"/g)].map(match => match[1]);
}

test("outfit renderer preserves empty and complete card contracts", () => {
  assert.equal(renderOutfitEditor([]), "<p>アウトフィット未登録</p>");
  const html = renderOutfitEditor([outfit({ _key: "other-1" })]);
  assert.match(html, /^<article class="outfit-card outfit-form" data-outfit-key="other-1" data-outfit-ofc-details=/);
  assert.match(html, /data-delete-outfit="other-1"/);
  assert.match(html, /<option value="other" selected>その他<\/option>/);
  assert.deepEqual(fields(html), [
    "category", "name", "purchase_value", "experience_cost", "concealment", "concealment_penalty",
    "electronic_control", "slot", "manufacturer", "page_number", "major_category", "minor_category", "description"
  ]);
});

test("outfit renderer emits complete category-specific canonical control schemas", () => {
  const common = ["category", "name", "purchase_value", "experience_cost", "concealment", "concealment_penalty"];
  const metadata = ["manufacturer", "page_number", "major_category", "minor_category", "description"];
  const cases = [
    ["weapon", ["attack", "parry", "range", "speed", "electronic_control", "slot"]],
    ["armor", ["defense_s", "defense_p", "defense_i", "control_modifier", "electronic_control", "slot"]],
    ["cyberware", ["electronic_control", "ianus_surface", "ianus_deep", "ianus_none", "slot"]],
    ["tron", ["electronic_control", "speed", "tron_software", "tron_support", "tron_hardware", "cs_modifier", "slot"]],
    ["vehicle", ["attack", "speed", "control_modifier", "cs_modifier", "electronic_control", "defense_s", "defense_p", "defense_i", "crew", "sf", "slot"]],
    ["residence", ["speed", "electronic_control", "residence_entry", "residence_electric", "residence_area", "slot"]],
    ["other", ["electronic_control", "slot"]]
  ];

  for (const [category, categoryFields] of cases) {
    const html = renderOutfitEditor([outfit({ _key: category, category })]);
    assert.deepEqual(fields(html), [...common, ...categoryFields, ...metadata], category);
  }
});

test("OFC-backed controls exist at initial render and keep data-ofc identity", () => {
  const html = renderOutfitEditor([outfit({ category: "armor" })]);
  for (const key of ["concealment_penalty", "defense_s", "defense_p", "defense_i", "electronic_control", "manufacturer", "page_number"]) {
    assert.match(html, new RegExp(`data-o="${key}" data-ofc="${key}"`));
  }
});

test("outfit renderer keeps numeric controls and escapes user values", () => {
  const html = renderOutfitEditor([outfit({ _key: "armor-1", category: "armor", name: "<防具>", description: "A&B", experience_cost: 7, control_modifier: -2 })]);
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
