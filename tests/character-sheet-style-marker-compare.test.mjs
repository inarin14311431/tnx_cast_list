import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalizeArchiveBundle,
  canonicalizeCharacterSheetJsonp,
  diffCanonicalBundles
} from "../js/character-sheet-jsonp-canonical.js";
import { compareCharacterSheetPayload } from "../js/character-sheet-compare-service.js";

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

test("TNX-000054: composite style marks compare as the same set regardless of order", () => {
  const differences = compareCharacterSheetPayload(
    {
      character: {
        style_1: "カタナ",
        style_1_mark: "●◎"
      }
    },
    {
      styles: [
        { name: "カタナ", mark: "◎●" }
      ]
    }
  );

  assert.deepEqual(differences.filter(item => item.category === "styles"), []);
});

test("real style mark changes remain comparison differences", () => {
  const differences = compareCharacterSheetPayload(
    {
      character: {
        style_1: "カタナ",
        style_1_mark: "●◎"
      }
    },
    {
      styles: [
        { name: "カタナ", mark: "◎" }
      ]
    }
  );

  const styleDifferences = differences.filter(item => item.category === "styles");
  assert.equal(styleDifferences.length, 1);
  assert.equal(styleDifferences[0].path, "style_1_mark");
  assert.equal(styleDifferences[0].archive, "◎●");
  assert.equal(styleDifferences[0].warehouse, "◎");
});

test("style slots remain strict while composite marks are normalized", () => {
  const differences = compareCharacterSheetPayload(
    {
      character: {
        style_1: "カタナ",
        style_1_mark: "●◎",
        style_2: "カブト",
        style_2_mark: "◎"
      }
    },
    {
      styles: [
        { name: "カブト", mark: "◎" },
        { name: "カタナ", mark: "◎●" }
      ]
    }
  );

  const paths = differences
    .filter(item => item.category === "styles")
    .map(item => item.path);
  assert.ok(paths.includes("style_1"));
  assert.ok(paths.includes("style_2"));
});

test("blank concealment value stays blank when only a modifier is supplied", () => {
  const warehouse = canonicalizeCharacterSheetJsonp({
    weapons: [{ name: "テスト武器", concealA: "", concealB: "-1" }]
  });

  assert.equal(warehouse.outfits["weapon:テスト武器"].concealment, "");
  assert.equal(warehouse.outfits["weapon:テスト武器"].concealment_penalty, "-1");
});
