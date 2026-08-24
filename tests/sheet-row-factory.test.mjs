import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createBlankSkill,
  createSkillRow,
  createGeneralBlankSlotRow,
  createStyleSeparatorRow,
  createBlankOutfit,
  createOutfitRow
} from "../js/sheet-row-factory.js";

test("skill factory preserves category defaults and explicit ordering", () => {
  const general = createBlankSkill("general", { key: "skill-general", sortOrder: 4 });
  const style = createBlankSkill("style", { key: "skill-style", sortOrder: 7 });
  const social = createBlankSkill("social", { key: "skill-social", sortOrder: 9 });

  assert.equal(general._key, "skill-general");
  assert.equal(general.sort_order, 4);
  assert.equal(general.skill_kind, "general");
  assert.equal(style.skill_kind, "normal");
  assert.equal(social.skill_kind, "proper");
  assert.deepEqual(
    [general.reason, general.passion, general.life, general.mundane],
    [false, false, false, false]
  );
  assert.equal(general.level, 1);
  assert.equal(general.free_level, 0);
  assert.equal(general.description, "");
});

test("skill row factory layers explicit values over canonical defaults", () => {
  const row = createSkillRow("general", {
    name: "射撃",
    level: 3,
    reason: true,
    skill_kind: "general"
  }, { key: "skill-row", sortOrder: 12 });

  assert.equal(row._key, "skill-row");
  assert.equal(row.category, "general");
  assert.equal(row.name, "射撃");
  assert.equal(row.level, 3);
  assert.equal(row.reason, true);
  assert.equal(row.free_level, 0);
  assert.equal(row.sort_order, 12);
});

test("skill row factory cannot override the requested category", () => {
  const row = createSkillRow("social", { category: "style", name: "社会：N◎VA" }, { key: "social-row" });
  assert.equal(row.category, "social");
  assert.equal(row.skill_kind, "proper");
});

test("general blank slot factory owns mutable editor slot semantics", () => {
  const row = createGeneralBlankSlotRow("right", { key: "blank-slot", sortOrder: 14 });
  assert.equal(row._key, "blank-slot");
  assert.equal(row.category, "general");
  assert.equal(row.level, 0);
  assert.equal(row.free_level, 0);
  assert.equal(row.skill_kind, "proper");
  assert.equal(row._blankSlot, true);
  assert.equal(row._slotColumn, "right");
  assert.equal(row.sort_order, 14);
});

test("style separator factory owns separator record semantics", () => {
  const row = createStyleSeparatorRow("__STYLE_SEPARATOR__", { key: "separator", sortOrder: 18 });
  assert.equal(row._key, "separator");
  assert.equal(row.category, "style");
  assert.equal(row.level, 1);
  assert.equal(row.free_level, 0);
  assert.equal(row.skill_kind, "none");
  assert.equal(row.description, "__STYLE_SEPARATOR__");
  assert.equal(row._rowType, "separator");
  assert.equal(row.sort_order, 18);
});

test("outfit factory preserves canonical blank base state only", () => {
  const outfit = createBlankOutfit({ key: "outfit-1", sortOrder: 3 });

  assert.deepEqual(outfit, {
    _key: "outfit-1",
    category: "other",
    name: "",
    purchase_value: "",
    experience_cost: 0,
    concealment: "",
    attack: "",
    range: "",
    slot: "",
    description: "",
    sort_order: 3
  });
  assert.equal("defense" in outfit, false);
  assert.equal("control_modifier" in outfit, false);
  assert.equal("cs_modifier" in outfit, false);
  assert.equal("mundane_modifier" in outfit, false);
});

test("outfit row factory layers import or editor values over the canonical blank", () => {
  const outfit = createOutfitRow({ category: "weapon", name: "テスト武器", attack: "+5" }, { key: "outfit-row", sortOrder: 8 });
  assert.equal(outfit._key, "outfit-row");
  assert.equal(outfit.category, "weapon");
  assert.equal(outfit.name, "テスト武器");
  assert.equal(outfit.attack, "+5");
  assert.equal(outfit.experience_cost, 0);
  assert.equal(outfit.sort_order, 8);
});

test("classic sheet keeps collection-aware ordering while delegating row defaults", async () => {
  const source = await readFile(new URL("../js/sheet.js", import.meta.url), "utf8");
  const factory = await readFile(new URL("../js/sheet-row-factory.js", import.meta.url), "utf8");

  assert.match(source, /createBlankSkill\(category, \{ sortOrder: skills\.length \}\)/);
  assert.match(source, /createBlankOutfit\(\{ sortOrder: outfits\.length \}\)/);
  assert.match(source, /createGeneralBlankSlotRow\(column, \{ sortOrder: skills\.length \}\)/);
  assert.match(source, /createStyleSeparatorRow\(STYLE_SEPARATOR_MARKER, \{ sortOrder: skills\.length \}\)/);
  assert.doesNotMatch(source, /_rowType:\s*["']separator["']/);
  assert.doesNotMatch(source, /_blankSlot:\s*true,\s*_slotColumn:/);
  assert.doesNotMatch(factory, /\bdocument\b|\bwindow\b|\bskills\b|\boutfits\b/);
  assert.doesNotMatch(factory, /save|persist|render|markDirty|recalc/);
});
