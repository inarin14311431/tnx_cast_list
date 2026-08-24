import test from "node:test";
import assert from "node:assert/strict";
import { buildCharacterSheetsPayload } from "../js/tnx-direct-transfer-data.js";

function baseCharacter() {
  return {
    public_id: "TNX-TEST",
    character_name: "TEST CAST",
    style_1: "カブキ",
    style_2: "カタナ",
    style_3: "ニューロ"
  };
}

function parsePayload(result) {
  return JSON.parse(result.jsonData.slice(1, -1));
}

test("direct transfer separates current concealment value and modifier", () => {
  const result = buildCharacterSheetsPayload({
    character: baseCharacter(),
    skills: [],
    outfits: [{
      category: "weapon",
      name: "TEST WEAPON",
      concealment: "12",
      ofc_details: { concealment_penalty: "-1", electronic_control: "18" }
    }]
  });
  const json = parsePayload(result);
  assert.equal(json.weapons[0].concealA, "12");
  assert.equal(json.weapons[0].concealB, "-1");
  assert.equal(json.weapons[0].electrical_control, "18");
});

test("direct transfer retains legacy combined concealment compatibility", () => {
  const result = buildCharacterSheetsPayload({
    character: baseCharacter(),
    skills: [],
    outfits: [{ category: "weapon", name: "LEGACY", concealment: "10/0" }]
  });
  const json = parsePayload(result);
  assert.equal(json.weapons[0].concealA, "10");
  assert.equal(json.weapons[0].concealB, "0");
});

test("armor and vehicle control transfer from canonical control_modifier", () => {
  const result = buildCharacterSheetsPayload({
    character: baseCharacter(),
    skills: [],
    outfits: [
      { category: "armor", name: "ARMOR", control_modifier: -1, ofc_details: { control_value: "99" } },
      { category: "vehicle", name: "VEHICLE", control_modifier: -2, ofc_details: { control_value: "88" } }
    ]
  });
  const json = parsePayload(result);
  assert.equal(json.armours[0].control, "-1");
  assert.equal(json.vehicles[0].control, "-2");
});
