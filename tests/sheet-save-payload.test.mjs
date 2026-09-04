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


test("style payload projects canonical detail into RPC columns", () => {
  const detail = {
    skill: "白兵",
    limit: "3",
    timing: "メジャー",
    target: "単体",
    range: "武器",
    difficulty: "制御値",
    confrontation: "回避",
    description: "追加ダメージを与える。",
    page: "TNX p.99"
  };
  const encoded = `@@TNX_STYLE_DETAIL_V1@@\n${JSON.stringify(detail)}`;
  const [payload] = buildSkillSavePayloads([{
    category: "style",
    name: "†羅刹刃",
    level: 1,
    skill_kind: "secret",
    description: encoded
  }]);

  assert.equal(payload.timing, "メジャー");
  assert.equal(payload.target, "単体");
  assert.equal(payload.range, "武器");
  assert.equal(payload.difficulty, "制御値");
  assert.equal(payload.confrontation, "回避");
  assert.deepEqual(
    JSON.parse(payload.description.slice("@@TNX_STYLE_DETAIL_V1@@".length).trim()),
    detail
  );
});

test("style payload parses legacy labeled descriptions", () => {
  const [payload] = buildSkillSavePayloads([{
    category: "style",
    name: "変身",
    level: 1,
    description: [
      "技能：なし",
      "上限：5",
      "タイミング：常時",
      "対象：自身",
      "射程：なし",
      "目標値：なし",
      "対決：なし",
      "変身して戦う。 ",
      "参照P：TNX p.12"
    ].join("\n")
  }]);

  assert.equal(payload.timing, "常時");
  assert.equal(payload.target, "自身");
  assert.equal(payload.range, "なし");
  assert.equal(payload.difficulty, "なし");
  assert.equal(payload.confrontation, "なし");
  const saved = JSON.parse(payload.description.slice("@@TNX_STYLE_DETAIL_V1@@".length).trim());
  assert.equal(saved.skill, "なし");
  assert.equal(saved.limit, "5");
  assert.equal(saved.description, "変身して戦う。");
  assert.equal(saved.page, "TNX p.12");
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
  assert.equal(Object.hasOwn(payload[0], "defense"), false);
  assert.equal(Object.hasOwn(payload[0], "mundane_modifier"), false);
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
