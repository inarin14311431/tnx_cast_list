import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/sheet-birthplace.js", import.meta.url), "utf8");

test("sheet birthplace uses an explicit initializer", () => {
  assert.match(source, /async function initializeSheetBirthplace\(\)/);
  assert.match(source, /initializeSheetBirthplace\(\);/);
});

test("sheet birthplace initialization stays idempotent through the field existence guard", () => {
  assert.match(source, /document\.querySelector\('#birthplace'\)/);
  assert.match(source, /input\.id = 'birthplace'/);
});

test("sheet birthplace preserves load and manual-save integration", () => {
  assert.match(source, /\.select\('birthplace'\)/);
  assert.match(source, /functionName === 'save_character_bundle'/);
  assert.match(source, /args\.p_character\.birthplace = input\.value\.trim\(\) \|\| DEFAULT_BIRTHPLACE/);
  assert.match(source, /__tnxManualSaveBirthplacePatched/);
  assert.match(source, /status\.textContent = '未保存'/);
});
