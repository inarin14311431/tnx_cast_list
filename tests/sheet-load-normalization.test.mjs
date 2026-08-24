import test from "node:test";
import assert from "node:assert/strict";
import {
  STYLE_SEPARATOR_MARKER,
  STYLE_DETAIL_PREFIX,
  inferLoadedSkillKind,
  isStyleSeparatorDescription,
  isStyleSeparatorRecord,
  normalizeLoadedSkill,
  normalizeLoadedOutfit
} from "../js/sheet-load-normalization.js";

test("loaded skill normalization preserves editor defaults and legacy initial labels", () => {
  const social = normalizeLoadedSkill({ id: "s1", category: "social", name: "社会：初期取得", level: "2", free_level: "1" });
  assert.equal(social._key, "s1");
  assert.equal(social.name, "社会：");
  assert.equal(social.level, 2);
  assert.equal(social.free_level, 1);
  assert.equal(social.skill_kind, "proper");
  assert.equal(social.reason, false);

  const connection = normalizeLoadedSkill({ id: "c1", category: "connection", name: "初期取得", level: 1 });
  assert.equal(connection.name, "コネ：");
});

test("style skill normalization centralizes inferred kinds and V1 separator compatibility", () => {
  assert.equal(inferLoadedSkillKind({ category: "style", type: "奥義" }), "ultimate");
  assert.equal(inferLoadedSkillKind({ category: "style", type: "演出" }), "direction");
  assert.equal(inferLoadedSkillKind({ category: "general", name: "製作：武器" }), "proper");

  const detail = `${STYLE_DETAIL_PREFIX}${JSON.stringify({ description: `${STYLE_SEPARATOR_MARKER}group` })}`;
  assert.equal(isStyleSeparatorDescription(detail), true);
  const separator = normalizeLoadedSkill({ id: "sep", category: "style", name: "カタナ", level: 1, description: detail });
  assert.equal(separator._rowType, "separator");
  assert.equal(separator.skill_kind, "none");
  assert.equal(isStyleSeparatorRecord(separator), true);
});

test("loaded outfit normalization keeps canonical base state without rebuilding retired fields", () => {
  const outfit = normalizeLoadedOutfit({ id: "o1", category: "armor", name: "ARMOR", experience_cost: "3", control_modifier: -1 });
  assert.equal(outfit._key, "o1");
  assert.equal(outfit.experience_cost, 3);
  assert.equal(outfit.control_modifier, -1);
  assert.equal(outfit.attack, "");
  assert.equal(Object.hasOwn(outfit, "defense"), false);
  assert.equal(Object.hasOwn(outfit, "mundane_modifier"), false);
});
