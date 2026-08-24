import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { normalizeImportedOutfitDetails } from "../js/outfit-ofc-adapter.js";

const saveSource = await readFile(new URL("../js/outfit-ofc-save.js", import.meta.url), "utf8");

test("OFC adapter consumes legacy aliases and retired mundane modifier", () => {
  const vehicle = normalizeImportedOutfitDetails("vehicle", {
    control_value: "-2",
    cs_value: "1",
    mundane_modifier: "9",
    manufacturer: "TEST"
  });
  assert.equal(vehicle.control_modifier, "-2");
  assert.equal(vehicle.cs_modifier, "1");
  assert.equal(vehicle.manufacturer, "TEST");
  assert.equal(Object.hasOwn(vehicle, "control_value"), false);
  assert.equal(Object.hasOwn(vehicle, "cs_value"), false);
  assert.equal(Object.hasOwn(vehicle, "mundane_modifier"), false);
});

test("OFC adapter enforces category-specific modifiers", () => {
  const cyberware = normalizeImportedOutfitDetails("cyberware", {
    control_modifier: "-4",
    cs_modifier: "3",
    electronic_control: "15"
  });
  assert.equal(Object.hasOwn(cyberware, "control_modifier"), false);
  assert.equal(Object.hasOwn(cyberware, "cs_modifier"), false);
  assert.equal(cyberware.electronic_control, "15");
});

test("PC OFC save route uses shared canonical detail normalization", () => {
  assert.match(saveSource, /normalizeImportedOutfitDetails/);
  assert.match(saveSource, /ofc_details:\s*normalizeImportedOutfitDetails\(category, details\)/);
  assert.match(saveSource, /return normalizeImportedOutfitDetails\(category,/);
  assert.match(saveSource, /function withoutRetiredModifier/);
  assert.match(saveSource, /delete current\.mundane_modifier/);
});
