import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/sheet-image.js", import.meta.url), "utf8");

test("PC image registration uses the shared sheet save-state bridge", () => {
  assert.match(source, /from "\.\/sheet-save-state\.js\?v=2"/);
  assert.match(source, /requestSheetSave\(\)/);
  assert.match(source, /await waitForSheetSaved\(20000\)/);
  assert.doesNotMatch(source, /querySelector\("#save-status"\)/);
  assert.doesNotMatch(source, /querySelector\("#save-button"\)/);
  assert.doesNotMatch(source, /while\(Date\.now\(\)-started<20000\)/);
});

test("PC image registration still resolves the saved character before upload", () => {
  assert.match(source, /const publicId=getPublicId\(\)/);
  assert.match(source, /if\(!publicId\)throw new Error\("保存後のキャストIDを確認できませんでした。"\)/);
  assert.match(source, /return loadCharacter\(publicId\)/);
});
