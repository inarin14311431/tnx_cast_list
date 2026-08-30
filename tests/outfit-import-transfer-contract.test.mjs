import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  masterRowToOutfitDetails,
  normalizeImportedOutfitDetails
} from "../js/outfit-ofc-adapter.js";

const legacy = await readFile(new URL("../js/sheet-import-outfit-compat.js", import.meta.url), "utf8");
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

test("OFC master application uses the shared adapter owner", () => {
  assert.match(master, /masterRowToOutfitDetails/);
  assert.match(master, /outfit-ofc-adapter\.js/);
  assert.doesNotMatch(master, /function masterRowDetails/);
  assert.doesNotMatch(master, /outfit-ofc-tsv/);
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
