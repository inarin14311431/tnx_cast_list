import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("PC outfit layout has one canonical presentation owner", async () => {
  const features = await read("js/sheet-features.js");
  const display = await read("js/outfit-display-rules-v5.js");

  assert.doesNotMatch(features, /initializeArmorOutfitColumns/);
  assert.match(display, /Canonical PC outfit layout controller/);
  assert.match(display, /\["base","control_modifier","制御値"\]/);
  assert.match(display, /\["base","cs_modifier","CS修正"\]/);
  assert.doesNotMatch(display, /\["ofc","control_value"/);
  assert.doesNotMatch(display, /\["ofc","cs_value"/);
  assert.doesNotMatch(display, /\["base","mundane_modifier"/);
});

test("PC OFC field generation follows category semantics", async () => {
  const source = await read("js/outfit-ofc-fields.js");

  assert.match(source, /cyberware: \[\.\.\.COMMON_FIELDS, "electronic_control", "ianus_surface", "ianus_deep", "ianus_none"\]/);
  assert.match(source, /tron: \[\.\.\.COMMON_FIELDS, "speed", "electronic_control", "tron_software", "tron_support", "tron_hardware"\]/);
  assert.match(source, /vehicle: \[\.\.\.COMMON_FIELDS, "speed", "electronic_control", "defense_s", "defense_p", "defense_i", "crew", "sf"\]/);
  assert.match(source, /residence: \[\.\.\.COMMON_FIELDS, "speed", "electronic_control", "residence_entry", "residence_electric", "residence_area"\]/);
  assert.doesNotMatch(source, /cyberware: \[[^\n]*"control_value"/);
  assert.doesNotMatch(source, /tron: \[[^\n]*"control_value"/);
  assert.doesNotMatch(source, /vehicle: \[[^\n]*"cs_value"/);
});

test("hidden legacy OFC detail values are preserved on save", async () => {
  const fields = await read("js/outfit-ofc-fields.js");
  const save = await read("js/outfit-ofc-save.js");

  assert.match(fields, /globalThis\.TNXOutfitOFCState/);
  assert.match(fields, /Object\.entries\(source\)/);
  assert.match(save, /TNXOutfitOFCState\?\.getDetails/);
  assert.doesNotMatch(save, /details\.control_value\s*=/);
});
