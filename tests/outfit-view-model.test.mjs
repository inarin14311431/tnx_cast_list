import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeOutfitForView,
  formatPurchasePair,
  formatConcealmentPair
} from "../js/outfit-view-model.js";

test("canonical view separates concealment value and modifier", () => {
  const current = normalizeOutfitForView({
    category: "weapon",
    concealment: "12",
    ofc_details: { concealment_penalty: "-1" }
  });
  assert.equal(current.concealment, "12");
  assert.equal(current.concealment_penalty, "-1");
  assert.equal(formatConcealmentPair(current), "12/-1");

  const legacy = normalizeOutfitForView({ category: "weapon", concealment: "10/0" });
  assert.equal(legacy.concealment, "10");
  assert.equal(legacy.concealment_penalty, "0");
});

test("shared outfit normalization is idempotent and preserves normalized zero modifiers", () => {
  const once = normalizeOutfitForView({
    category: "vehicle",
    concealment: "10/0",
    defense: "S 2 / P 3 / I 4",
    ofc_details: { speed: "5", electronic_control: "18", crew: "2" }
  });
  const twice = normalizeOutfitForView(once);
  assert.equal(twice.concealment, "10");
  assert.equal(twice.concealment_penalty, "0");
  assert.equal(twice.speed, "5");
  assert.equal(twice.electronic_control, "18");
  assert.equal(twice.defense_s, "2");
  assert.equal(twice.defense_p, "3");
  assert.equal(twice.defense_i, "4");
  assert.equal(twice.crew, "2");
});

test("control and CS modifiers are category constrained", () => {
  const cyberware = normalizeOutfitForView({ category: "cyberware", control_modifier: 4, cs_modifier: 2 });
  assert.equal(cyberware.control_modifier, "");
  assert.equal(cyberware.cs_modifier, "");
  assert.equal(Object.hasOwn(cyberware, "cs_value"), false);

  const armor = normalizeOutfitForView({ category: "armor", control_modifier: -1, cs_modifier: 3 });
  assert.equal(armor.control_modifier, "-1");
  assert.equal(armor.cs_modifier, "");

  const tron = normalizeOutfitForView({ category: "tron", control_modifier: -3, cs_modifier: 2 });
  assert.equal(tron.control_modifier, "");
  assert.equal(tron.cs_modifier, "2");
  assert.equal(Object.hasOwn(tron, "cs_value"), false);

  const vehicle = normalizeOutfitForView({ category: "vehicle", control_modifier: -2, cs_modifier: 1 });
  assert.equal(vehicle.control_modifier, "-2");
  assert.equal(vehicle.cs_modifier, "1");
});

test("purchase pair prefers OFC structured values but preserves base fallback", () => {
  assert.equal(formatPurchasePair({ purchase_value: "15", experience_cost: 2 }), "15/2");
  assert.equal(formatPurchasePair({
    purchase_value: "15",
    experience_cost: 2,
    ofc_details: { purchase_target: "18", permanent_cost: "4" }
  }), "18/4");
});

test("OFC performance fields normalize onto the shared view model", () => {
  const item = normalizeOutfitForView({
    category: "vehicle",
    electronic_control: "",
    defense: "S 2 / P 3 / I 4",
    ofc_details: {
      speed: "5",
      electronic_control: "18",
      crew: "2",
      sf: "1"
    }
  });
  assert.equal(item.speed, "5");
  assert.equal(item.electronic_control, "18");
  assert.equal(item.defense_s, "2");
  assert.equal(item.defense_p, "3");
  assert.equal(item.defense_i, "4");
  assert.equal(item.crew, "2");
  assert.equal(item.sf, "1");
});
