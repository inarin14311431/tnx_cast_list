import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { normalizeImportedOutfitDetails } from "../js/outfit-ofc-adapter.js";

const cleanup = await readFile(new URL("../supabase/12_outfit_canonical_cleanup.sql", import.meta.url), "utf8");
const adapter = await readFile(new URL("../js/outfit-ofc-adapter.js", import.meta.url), "utf8");
const contract = await readFile(new URL("../js/outfit-contract.js", import.meta.url), "utf8");
const pcSave = await readFile(new URL("../js/outfit-ofc-save.js", import.meta.url), "utf8");
const pcFields = await readFile(new URL("../js/outfit-ofc-fields.js", import.meta.url), "utf8");
const mobileModel = await readFile(new URL("../js/sheet-mobile-outfit-model.js", import.meta.url), "utf8");
const classicSheet = await readFile(new URL("../js/sheet.js", import.meta.url), "utf8");

test("canonical cleanup removes retired outfit aliases and armor base defense", () => {
  assert.match(cleanup, /set defense = ''/);
  assert.match(cleanup, /- 'control_value' - 'cs_value' - 'mundane_modifier'/);
  assert.match(cleanup, /defense_s/);
  assert.match(cleanup, /defense_p/);
  assert.match(cleanup, /defense_i/);
});

test("legacy aliases are accepted only as input and normalize to canonical fields", () => {
  const vehicle = normalizeImportedOutfitDetails("vehicle", { control_value: "-2", cs_value: "1", mundane_modifier: "5" });
  assert.equal(vehicle.control_modifier, "-2");
  assert.equal(vehicle.cs_modifier, "1");
  assert.equal(Object.hasOwn(vehicle, "control_value"), false);
  assert.equal(Object.hasOwn(vehicle, "cs_value"), false);
  assert.equal(Object.hasOwn(vehicle, "mundane_modifier"), false);
});

test("current import and save boundaries do not re-emit retired aliases", () => {
  assert.match(adapter, /normalizeOutfitDetailCompatibility/);
  assert.match(contract, /delete normalized\.control_value/);
  assert.match(contract, /delete normalized\.cs_value/);
  assert.match(contract, /delete normalized\.mundane_modifier/);
  assert.match(pcSave, /normalizeImportedOutfitDetails/);
  assert.doesNotMatch(pcSave, /ofc_details\s*:\s*\{[^}]*control_value/s);
  assert.doesNotMatch(pcSave, /ofc_details\s*:\s*\{[^}]*cs_value/s);
  assert.doesNotMatch(mobileModel, /ofc_details\s*:\s*\{[^}]*control_value/s);
  assert.doesNotMatch(mobileModel, /ofc_details\s*:\s*\{[^}]*cs_value/s);
});

test("PC OFC compatibility state contains no retired field generation or DB hydration", () => {
  assert.doesNotMatch(pcFields, /control_value|cs_value|mundane_modifier/);
  assert.doesNotMatch(pcFields, /supabase|from\(["']character_outfits["']\)|createElement\(["']td["']\)/);
  assert.match(pcFields, /parseEmbeddedDetails/);
});

test("classic sheet no longer carries retired outfit transport or save scaffolding", () => {
  assert.doesNotMatch(classicSheet, /function compatibilityOutfitFields/);
  assert.doesNotMatch(classicSheet, /function legacyOutfitSaveFields/);
  assert.doesNotMatch(classicSheet, /data-o="defense"/);
  assert.doesNotMatch(classicSheet, /data-o="mundane_modifier"/);
  assert.doesNotMatch(classicSheet, /defense:\s*row\.defense/);
});
