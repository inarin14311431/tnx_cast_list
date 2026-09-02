import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalizeArchiveBundle,
  canonicalizeCharacterSheetJsonp,
  diffCanonicalBundles
} from "../js/character-sheet-jsonp-canonical.js";

test("style-skill rule markers do not create false comparison differences", () => {
  const archive = canonicalizeArchiveBundle({
    character: {},
    skills: [
      { category: "style", name: "電光石火", level: 1, life: true, description: "追加行動技能" },
      { category: "style", name: "変化自在", level: 1, passion: true, description: "判定補助技能" },
      { category: "style", name: "タイムリー", level: 1, reason: true, description: "演出技能" }
    ]
  });
  const warehouse = canonicalizeCharacterSheetJsonp({
    superhumanskills: [
      { name: "†電光石火", level: 1, h: true, notes: "追加行動技能" },
      { name: "※変化自在", level: 1, c: true, notes: "判定補助技能" },
      { name: "＠タイムリー", level: 1, s: true, notes: "演出技能" }
    ]
  });

  const styleDifferences = diffCanonicalBundles(archive, warehouse)
    .filter(item => item.category === "styleSkills");
  assert.deepEqual(styleDifferences, []);
});

test("blank concealment value stays blank when only a modifier is supplied", () => {
  const warehouse = canonicalizeCharacterSheetJsonp({
    weapons: [{ name: "テスト武器", concealA: "", concealB: "-1" }]
  });

  assert.equal(warehouse.outfits["weapon:テスト武器"].concealment, "");
  assert.equal(warehouse.outfits["weapon:テスト武器"].concealment_penalty, "-1");
});
