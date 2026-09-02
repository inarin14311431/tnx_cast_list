import test from "node:test";
import assert from "node:assert/strict";
import { groupCharacterSheetDifferences, summarizeCharacterSheetDifferences } from "../js/character-sheet-diff-display.js";

test("groups all changed fields of one skill into one display difference", () => {
  const fields = ["name", "level", "free_level", "reason", "passion", "life", "mundane", "skill_kind"];
  const differences = fields.map(field => ({
    category: "general",
    path: "操縦：地上車両 / " + field,
    archive: "",
    warehouse: field === "name" ? "操縦：地上車両" : field === "level" ? 1 : field === "free_level" ? 0 : field === "reason" ? true : false
  }));

  const groups = groupCharacterSheetDifferences(differences);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].record, true);
  assert.equal(groups[0].category, "general");
  assert.equal(groups[0].path, "操縦：地上車両");
  assert.equal(groups[0].presence, "added");
  assert.deepEqual(groups[0].fields.map(field => field.field), fields);
});

test("classifies a record missing from the warehouse as removed", () => {
  const groups = groupCharacterSheetDifferences([
    { category: "general", path: "隠密 / name", archive: "隠密", warehouse: "" },
    { category: "general", path: "隠密 / level", archive: 2, warehouse: "" }
  ]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].presence, "removed");
});

test("keeps field details when both sides contain the same record", () => {
  const groups = groupCharacterSheetDifferences([
    { category: "general", path: "射撃 / name", archive: "射撃", warehouse: "射撃" },
    { category: "general", path: "射撃 / level", archive: 1, warehouse: 2 }
  ]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].presence, "changed");
  assert.deepEqual(groups[0].fields.map(field => field.field), ["name", "level"]);
});

test("summarizes additions and deletions from the warehouse baseline", () => {
  const groups = groupCharacterSheetDifferences([
    { category: "general", path: "操縦：地上車両 / name", archive: "", warehouse: "操縦：地上車両" },
    { category: "general", path: "操縦：地上車両 / level", archive: 0, warehouse: 1 },
    { category: "outfits", path: "weapon:単分子ブレード / name", archive: "単分子ブレード", warehouse: "" }
  ]);

  assert.deepEqual(summarizeCharacterSheetDifferences(groups), [
    "一般技能「操縦：地上車両」が削除されている",
    "ウェポンに「単分子ブレード」が追加されている"
  ]);
});

test("summarizes level ability and description changes", () => {
  const groups = groupCharacterSheetDifferences([
    { category: "general", path: "白兵 / level", archive: 2, warehouse: 1 },
    { category: "abilities", path: "reason_base", archive: 5, warehouse: 4 },
    { category: "outfits", path: "weapon:単分子ブレード / description", archive: "新しい解説", warehouse: "元の解説" }
  ]);

  assert.deepEqual(summarizeCharacterSheetDifferences(groups), [
    "白兵のレベルが1上がっている",
    "【理性】が1増えている",
    "単分子ブレードの解説文が変更されている"
  ]);
});

test("does not merge scalar differences or records from different categories", () => {
  const groups = groupCharacterSheetDifferences([
    { category: "general", path: "医療 / level", archive: 0, warehouse: 1 },
    { category: "social", path: "社会：N◎VA / level", archive: 0, warehouse: 1 },
    { category: "abilities", path: "reason_base", archive: 4, warehouse: 5 },
    { category: "abilities", path: "passion_base", archive: 4, warehouse: 5 }
  ]);

  assert.equal(groups.length, 4);
  assert.equal(groups[0].path, "医療");
  assert.equal(groups[1].path, "社会：N◎VA");
  assert.equal(groups[2].record, false);
  assert.equal(groups[3].record, false);
});
