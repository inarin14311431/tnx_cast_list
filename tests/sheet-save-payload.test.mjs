import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCharacterSavePayload,
  buildSkillSavePayloads,
  buildOutfitSavePayloads
} from "../js/sheet-save-payload.js";

test("character payload preserves ability, control and CS semantics", () => {
  const payload = buildCharacterSavePayload({
    base: {
      character_name: "  CAST  ",
      player_name: "  PLAYER  ",
      visibility: "public",
      experience_points: 42
    },
    structured: { age: " 24歳 " },
    styles: [{ name: "カタナ", mark: "◎", divine: "死の舞踏", divineYomi: "ダンス・マカブル" }],
    abilities: {
      reason: {
        current: 7,
        baseline: 5,
        modifier: 2,
        controlCurrent: 10,
        controlBaseline: 8,
        controlModifier: -1
      }
    },
    cs: { base: 8, modifier: 2 }
  });

  assert.equal(payload.character_name, "CAST");
  assert.equal(payload.player_name, "PLAYER");
  assert.equal(payload.age, "24歳");
  assert.equal(payload.style_1, "カタナ");
  assert.equal(payload.style_1_mark, "◎");
  assert.equal(payload.divine_1, "死の舞踏");
  assert.equal(payload.reason_base, 7);
  assert.equal(payload.reason_growth, 2);
  assert.equal(payload.reason_gear, 2);
  assert.equal(payload.reason_manual, 0);
  assert.equal(payload.reason_value, 9);
  assert.equal(payload.reason_control_base, 10);
  assert.equal(payload.reason_control_growth, 2);
  assert.equal(payload.reason_control_gear, -1);
  assert.equal(payload.reason_control_manual, 0);
  assert.equal(payload.reason_control, 9);
  assert.equal(payload.cs_base, 8);
  assert.equal(payload.cs_gear, 2);
  assert.equal(payload.cs_manual, 0);
  assert.equal(payload.cs, 10);
});

test("skill payload filters empty rows and preserves style separators", () => {
  const skills = [
    { category: "general", name: "射撃", level: 1, free_level: 0, skill_kind: "general", reason: true },
    { category: "style", name: "カタナ", level: 1, free_level: 0, skill_kind: "none", _separator: true },
    { category: "general", name: "", level: 0 }
  ];
  const payload = buildSkillSavePayloads(skills, {
    isStyleSeparator: item => item._separator === true,
    styleSeparatorMarker: "[[STYLE_SEPARATOR]]"
  });

  assert.equal(payload.length, 2);
  assert.equal(payload[0].sort_order, 0);
  assert.equal(payload[0].reason, true);
  assert.equal(payload[1].description, "[[STYLE_SEPARATOR]]");
  assert.equal(payload[1].sort_order, 1);
});

test("outfit payload emits category-owned base fields and structured OFC defense", () => {
  const payload = buildOutfitSavePayloads([
    { category: "armor", name: "ARMOR", control_modifier: -2, cs_modifier: 9, defense_s: "1", defense_p: "2", defense_i: "3" },
    { category: "tron", name: "TRON", control_modifier: -4, cs_modifier: 1 },
    { category: "vehicle", name: "VEHICLE", attack: "I+5", control_modifier: -1, cs_modifier: 2 },
    { category: "cyberware", name: "CYBER", control_modifier: -8, cs_modifier: 7 }
  ]);

  assert.equal(payload[0].control_modifier, -2);
  assert.equal(Object.hasOwn(payload[0], "cs_modifier"), false);
  assert.equal(payload[0].defense, "");
  assert.equal(payload[0].ofc_details.defense_s, "1");
  assert.equal(payload[0].ofc_details.defense_p, "2");
  assert.equal(payload[0].ofc_details.defense_i, "3");
  assert.equal(payload[1].cs_modifier, 1);
  assert.equal(Object.hasOwn(payload[1], "control_modifier"), false);
  assert.equal(payload[2].attack, "I+5");
  assert.equal(payload[2].control_modifier, -1);
  assert.equal(payload[2].cs_modifier, 2);
  assert.equal(Object.hasOwn(payload[3], "control_modifier"), false);
  assert.equal(Object.hasOwn(payload[3], "cs_modifier"), false);
});

test("hidden OFC details survive model projection until explicitly edited", () => {
  const [payload] = buildOutfitSavePayloads([{
    category: "other",
    name: "OTHER",
    _ofc_details: {
      manufacturer: "保存済メーカー",
      page_number: "99",
      retained_extension: "keep"
    }
  }]);

  assert.equal(payload.ofc_details.manufacturer, "保存済メーカー");
  assert.equal(payload.ofc_details.page_number, "99");
  assert.equal(payload.ofc_details.retained_extension, "keep");
});
