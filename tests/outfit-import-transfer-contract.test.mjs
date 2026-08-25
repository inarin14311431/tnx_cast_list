import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  masterRowToOutfitDetails,
  normalizeImportedOutfitDetails
} from "../js/outfit-ofc-adapter.js";

const legacy = await readFile(new URL("../js/sheet-import-outfit-compat.js", import.meta.url), "utf8");
const tsv = await readFile(new URL("../js/outfit-ofc-tsv.js", import.meta.url), "utf8");
const master = await readFile(new URL("../js/outfit-ofc-master-apply.js", import.meta.url), "utf8");

test("legacy outfit import keeps concealment value and modifier separated", () => {
  assert.match(legacy, /concealment:first\(data,"concealA","concealment"\)/);
  assert.match(legacy, /ofc\("concealment_penalty",first\(data,"concealB","concealmentPenalty","concealment_penalty"\)\)/);
  assert.doesNotMatch(legacy, /concealment:\[concealA,concealB\]/);
});

test("legacy outfit import uses the shared adapter for current control and CS semantics", () => {
  assert.match(legacy, /outfit-ofc-adapter\.js\?v=1/);
  assert.match(legacy, /normalizeImportedOutfitDetails\(item\.category/);
  assert.match(legacy, /control_modifier:first\(data,"control","controlModifier","controlValue"\)/);
  assert.match(legacy, /cs_modifier:first\(data,"cs","csModifier"\)/);
  assert.doesNotMatch(legacy, /\["armor","vehicle"\]\.includes\(item\.category\)/);
  assert.doesNotMatch(legacy, /\["tron","vehicle"\]\.includes\(item\.category\)/);
  assert.match(legacy, /ofc\("electronic_control"/);
});

test("OFC TSV keeps legacy headers external but normalizes aliases into the editor model", () => {
  assert.match(tsv, /"control_value", "electronic_control"/);
  assert.match(tsv, /control_modifier: row\.control_modifier \|\| row\.control_value/);
  assert.match(tsv, /cs_modifier: row\.cs_modifier \|\| row\.cs_value/);
  assert.match(tsv, /TNXSheetEditor\?\.applyOutfitDetailsForImport/);
  assert.doesNotMatch(tsv, /data-o="control_modifier"/);
  assert.doesNotMatch(tsv, /data-o="cs_modifier"/);
  assert.doesNotMatch(tsv, /data-pc-outfit-proxy="concealment"/);
});

test("OFC master and TSV share one adapter owner", () => {
  assert.match(master, /masterRowToOutfitDetails/);
  assert.match(tsv, /masterRowToOutfitDetails/);
  assert.doesNotMatch(master, /function masterRowDetails/);
  assert.doesNotMatch(tsv, /function masterRowDetails/);
});

test("shared OFC adapter maps legacy master control into canonical category fields", () => {
  const armor = masterRowToOutfitDetails({ site_category: "armor", control_value: -1, raw_data: { CS: 3 } });
  assert.equal(armor.control_modifier, "-1");
  assert.equal(Object.hasOwn(armor, "cs_modifier"), false);
  assert.equal(Object.hasOwn(armor, "control_value"), false);

  const vehicle = normalizeImportedOutfitDetails("vehicle", { control_value: -2, cs_value: 1 });
  assert.equal(vehicle.control_modifier, "-2");
  assert.equal(vehicle.cs_modifier, "1");
  assert.equal(Object.hasOwn(vehicle, "control_value"), false);
  assert.equal(Object.hasOwn(vehicle, "cs_value"), false);

  const cyberware = normalizeImportedOutfitDetails("cyberware", { control_value: 4, cs_value: 2, electronic_control: 18 });
  assert.equal(Object.hasOwn(cyberware, "control_modifier"), false);
  assert.equal(Object.hasOwn(cyberware, "cs_modifier"), false);
  assert.equal(cyberware.electronic_control, "18");
});
