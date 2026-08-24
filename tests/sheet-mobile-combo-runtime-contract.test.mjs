import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/sheet-mobile-combos.js", import.meta.url), "utf8");

test("mobile combos use shared editor context instead of independent auth lookup", () => {
  assert.match(source, /getMobileEditorContext/);
  assert.doesNotMatch(source, /requireAuth/);
  assert.doesNotMatch(source, /from\(["']characters["']\)/);
});

test("mobile combos keep save coordinator and database contracts", () => {
  assert.match(source, /tnx:mobile-before-save/);
  assert.match(source, /character_combos/);
  assert.match(source, /character_skills/);
});

test("mobile combos preserve combo and counter edit rules", () => {
  assert.match(source, /TIMING_OPTIONS/);
  assert.match(source, /TARGET_OPTIONS/);
  assert.match(source, /RANGE_OPTIONS/);
  assert.match(source, /limitOptions/);
  assert.match(source, /isCounter/);
  assert.match(source, /技能カウンターはスタイル技能と使用上限を指定してください/);
  assert.match(source, /コンボ名と組み合わせ技能を入力してください/);
});
