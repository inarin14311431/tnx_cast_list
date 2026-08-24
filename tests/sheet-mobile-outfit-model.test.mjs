import test from "node:test";
import assert from "node:assert/strict";
import { blankOutfit, cloneOutfit, collectOutfitRecord } from "../js/sheet-mobile-outfit-model.js";

test("mobile outfit reads legacy combined concealment but saves split fields", () => {
  const item = cloneOutfit({
    id: "legacy",
    category: "weapon",
    name: "LEGACY",
    concealment: "12/-1",
    ofc_details: {}
  });
  assert.equal(item._concealValue, "12");
  assert.equal(item._concealMod, "-1");

  const record = collectOutfitRecord(item, { id: "character" });
  assert.equal(record.concealment, "12");
  assert.equal(record.ofc_details.concealment, "12");
  assert.equal(record.ofc_details.concealment_penalty, "-1");
});

test("mobile outfit prefers structured concealment modifier", () => {
  const item = cloneOutfit({
    category: "armor",
    name: "ARMOR",
    concealment: "10/0",
    ofc_details: { concealment_penalty: "-2" }
  });
  assert.equal(item._concealValue, "10");
  assert.equal(item._concealMod, "-2");
});

test("mobile outfit reads legacy combined defense but never saves it again", () => {
  const item = cloneOutfit({
    category: "vehicle",
    name: "LEGACY DEFENSE",
    defense: "S 12 / P 9 / I 7",
    ofc_details: {}
  });
  assert.equal(item._defS, "12");
  assert.equal(item._defP, "9");
  assert.equal(item._defI, "7");

  const record = collectOutfitRecord(item, { id: "character" });
  assert.equal(record.defense, "");
  assert.equal(record.ofc_details.defense_s, "12");
  assert.equal(record.ofc_details.defense_p, "9");
  assert.equal(record.ofc_details.defense_i, "7");
});

test("mobile outfit keeps control_modifier canonical without generating deprecated detail keys", () => {
  const item = cloneOutfit({
    category: "vehicle",
    name: "VEHICLE",
    control_modifier: -2,
    cs_modifier: 1,
    ofc_details: {}
  });
  assert.equal(item.control_modifier, -2);
  assert.equal(Object.hasOwn(item.ofc_details, "control_value"), false);
  assert.equal(Object.hasOwn(item.ofc_details, "cs_value"), false);

  const record = collectOutfitRecord(item, { id: "character" });
  assert.equal(record.control_modifier, -2);
  assert.equal(record.cs_modifier, 1);
  assert.equal(Object.hasOwn(record.ofc_details, "control_value"), false);
  assert.equal(Object.hasOwn(record.ofc_details, "cs_value"), false);
});

test("mobile outfit applies category constraints when saving control and CS modifiers", () => {
  const weapon = collectOutfitRecord(cloneOutfit({
    category: "weapon", name: "WEAPON", control_modifier: -3, cs_modifier: 2, ofc_details: {}
  }), { id: "character" });
  assert.equal(weapon.control_modifier, 0);
  assert.equal(weapon.cs_modifier, 0);

  const armor = collectOutfitRecord(cloneOutfit({
    category: "armor", name: "ARMOR", control_modifier: -1, cs_modifier: 2, ofc_details: {}
  }), { id: "character" });
  assert.equal(armor.control_modifier, -1);
  assert.equal(armor.cs_modifier, 0);

  const tron = collectOutfitRecord(cloneOutfit({
    category: "tron", name: "TRON", control_modifier: -1, cs_modifier: 2, ofc_details: {}
  }), { id: "character" });
  assert.equal(tron.control_modifier, 0);
  assert.equal(tron.cs_modifier, 2);
});

test("mobile outfit consumes legacy detail aliases into canonical base modifiers", () => {
  const item = cloneOutfit({
    category: "vehicle",
    name: "LEGACY DETAIL",
    ofc_details: { control_value: "-3", cs_value: "2", manufacturer: "TEST" }
  });
  assert.equal(item.control_modifier, -3);
  assert.equal(item.cs_modifier, 2);
  assert.equal(Object.hasOwn(item.ofc_details, "control_value"), false);
  assert.equal(Object.hasOwn(item.ofc_details, "cs_value"), false);

  const record = collectOutfitRecord(item, { id: "character" });
  assert.equal(record.control_modifier, -3);
  assert.equal(record.cs_modifier, 2);
  assert.equal(Object.hasOwn(record.ofc_details, "control_value"), false);
  assert.equal(Object.hasOwn(record.ofc_details, "cs_value"), false);
  assert.equal(record.ofc_details.manufacturer, "TEST");
});

test("mobile editor no longer creates or saves retired mundane_modifier", () => {
  const blank = blankOutfit();
  assert.equal(Object.hasOwn(blank, "mundane_modifier"), false);

  const item = cloneOutfit({
    category: "other",
    name: "LEGACY MUNDANE",
    mundane_modifier: 7,
    ofc_details: { mundane_modifier: "8" }
  });
  assert.equal(Object.hasOwn(item, "mundane_modifier"), false);
  assert.equal(Object.hasOwn(item.ofc_details, "mundane_modifier"), false);

  const record = collectOutfitRecord(item, { id: "character" });
  assert.equal(Object.hasOwn(record, "mundane_modifier"), false);
  assert.equal(Object.hasOwn(record.ofc_details, "mundane_modifier"), false);
});
