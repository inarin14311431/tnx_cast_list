import test from "node:test";
import assert from "node:assert/strict";
import {
  OUTFIT_BASE_FIELDS,
  OUTFIT_DESCRIPTION_FIELDS,
  OUTFIT_FIELD_LABELS,
  OUTFIT_LEGACY_READ_ONLY_DETAIL_FIELDS,
  normalizeOutfitDetailCompatibility,
  outfitCanonicalFields,
  outfitPerformanceFields,
  outfitSupportsControl,
  outfitSupportsCsModifier
} from "../js/outfit-contract.js";

test("canonical outfit contract fixes common and description groups", () => {
  assert.deepEqual(OUTFIT_BASE_FIELDS, [
    "name", "purchase_value", "experience_cost", "concealment", "concealment_penalty", "slot"
  ]);
  assert.deepEqual(OUTFIT_DESCRIPTION_FIELDS, ["description", "page_number"]);
});

test("canonical outfit labels use current terminology", () => {
  assert.equal(OUTFIT_FIELD_LABELS.concealment, "隠匿値");
  assert.equal(OUTFIT_FIELD_LABELS.concealment_penalty, "隠匿修正");
  assert.equal(OUTFIT_FIELD_LABELS.control_modifier, "制御値");
  assert.equal(OUTFIT_FIELD_LABELS.cs_modifier, "CS修正");
  assert.equal(OUTFIT_FIELD_LABELS.electronic_control, "電制");
  assert.equal(Object.hasOwn(OUTFIT_FIELD_LABELS, "mundane_modifier"), false);
});

test("canonical outfit contract constrains control and CS semantics", () => {
  for (const category of ["armor", "vehicle"]) assert.equal(outfitSupportsControl(category), true);
  for (const category of ["weapon", "cyberware", "tron", "residence", "other"]) assert.equal(outfitSupportsControl(category), false);

  for (const category of ["tron", "vehicle"]) assert.equal(outfitSupportsCsModifier(category), true);
  for (const category of ["weapon", "armor", "cyberware", "residence", "other"]) assert.equal(outfitSupportsCsModifier(category), false);
});

test("canonical outfit contract keeps category-specific performance fields", () => {
  assert.ok(outfitPerformanceFields("weapon").includes("attack"));
  assert.ok(outfitPerformanceFields("armor").includes("defense_s"));
  assert.ok(outfitPerformanceFields("tron").includes("cs_modifier"));
  assert.ok(outfitPerformanceFields("vehicle").includes("control_modifier"));
  assert.ok(outfitPerformanceFields("residence").includes("residence_entry"));
});

test("canonical field list composes category, base, performance, and description fields", () => {
  const armor = outfitCanonicalFields("armor");
  assert.deepEqual(armor.slice(0, 7), ["category", ...OUTFIT_BASE_FIELDS]);
  assert.ok(armor.includes("control_modifier"));
  assert.equal(armor.includes("cs_modifier"), false);
  assert.deepEqual(armor.slice(-2), OUTFIT_DESCRIPTION_FIELDS);
});

test("legacy control and CS detail aliases are read-only compatibility fields", () => {
  assert.deepEqual(OUTFIT_LEGACY_READ_ONLY_DETAIL_FIELDS, ["control_value", "cs_value"]);
});

test("shared compatibility normalizer consumes legacy aliases without re-emitting them", () => {
  const vehicle = normalizeOutfitDetailCompatibility("vehicle", {
    control_value: "-2",
    cs_value: "1",
    mundane_modifier: "99",
    manufacturer: "TEST"
  });
  assert.equal(vehicle.control_modifier, "-2");
  assert.equal(vehicle.cs_modifier, "1");
  assert.equal(vehicle.manufacturer, "TEST");
  assert.equal(Object.hasOwn(vehicle, "control_value"), false);
  assert.equal(Object.hasOwn(vehicle, "cs_value"), false);
  assert.equal(Object.hasOwn(vehicle, "mundane_modifier"), false);
});

test("shared compatibility normalizer drops modifiers outside valid categories", () => {
  const weapon = normalizeOutfitDetailCompatibility("weapon", {
    control_value: "-3",
    cs_value: "2",
    control_modifier: "-4",
    cs_modifier: "3"
  });
  assert.equal(Object.hasOwn(weapon, "control_modifier"), false);
  assert.equal(Object.hasOwn(weapon, "cs_modifier"), false);

  const armor = normalizeOutfitDetailCompatibility("armor", { control_value: "-1", cs_value: "2" });
  assert.equal(armor.control_modifier, "-1");
  assert.equal(Object.hasOwn(armor, "cs_modifier"), false);
});
