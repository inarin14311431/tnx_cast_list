import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sheet = await readFile(new URL("../js/sheet.js", import.meta.url), "utf8");
const importer = await readFile(new URL("../js/sheet-import-outfit-compat.js", import.meta.url), "utf8");

test("classic editor exposes direct outfit state operations for import", () => {
  assert.match(sheet, /function addOutfitForImport\(category = "other"\)/);
  assert.match(sheet, /normalizeOutfitCategory\(category, OUTFIT_CATEGORIES\)/);
  assert.match(sheet, /return outfit\._key/);
  assert.match(sheet, /function clearOutfitsForImport\(\)/);
  assert.match(sheet, /addOutfitForImport,/);
  assert.match(sheet, /clearOutfitsForImport/);
});

test("legacy outfit importer prefers state API over simulated add/delete clicks", () => {
  assert.match(importer, /window\.TNXSheetEditor\?\.addOutfitForImport/);
  assert.match(importer, /window\.TNXSheetEditor\?\.clearOutfitsForImport/);
  assert.match(importer, /const key=directAdd\(item\.category\)/);
  assert.match(importer, /const row=await waitRow\(key\)/);
  assert.match(importer, /if\(typeof directClear==="function"\)/);
});

test("legacy DOM path remains only as compatibility fallback", () => {
  const directIndex = importer.indexOf('const directAdd=window.TNXSheetEditor?.addOutfitForImport');
  const genericIndex = importer.indexOf('const generic=document.querySelector("#add-outfit")');
  assert.ok(directIndex >= 0);
  assert.ok(genericIndex > directIndex);
});
