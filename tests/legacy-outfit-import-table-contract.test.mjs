import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/sheet-import-outfit-compat.js", import.meta.url), "utf8");
const base = await readFile(new URL("../js/sheet-import.js", import.meta.url), "utf8");

test("legacy outfit import is the canonical runtime owner", () => {
  assert.match(source, /TNXLegacyOutfitImport=\{owner:"sheet-import-outfit-compat"/);
  assert.match(source, /function stripOutfits\(data\)/);
  assert.match(source, /textarea\.value=JSON\.stringify\(baseData\)/);
  assert.match(source, /only runtime owner of outfit reconstruction/);
});

test("base legacy importer no longer contains outfit reconstruction", () => {
  assert.doesNotMatch(base, /function addOutfit\s*\(/);
  assert.doesNotMatch(base, /function importOutfits\s*\(/);
  assert.doesNotMatch(base, /stats\.outfit/);
  assert.doesNotMatch(base, /アウトフィットを取込中|アウトフィットを反映しています/);
  assert.match(base, /tnx:legacy-import-base-finished/);
});

test("legacy outfit import creates rows through the current category table UI", () => {
  assert.match(source, /data-add-outfit-category/);
  assert.match(source, /async function createRaw/);
  assert.match(source, /waitForCreatedRow/);
  assert.match(source, /const key=await createRaw\(item\)/);
  assert.match(source, /querySelectorAll\('\[data-outfit-key\]'\)|querySelectorAll\("\[data-outfit-key\]"\)/);
});

test("legacy outfit import supports DB-backed proxy fields", () => {
  assert.match(source, /function fieldControl\(row,field\)/);
  assert.match(source, /data-pc-outfit-proxy/);
  assert.match(source, /const base=\(field,value\)=>setValue\(fieldControl\(row,field\),value\)/);
});

test("legacy outfit import keeps concealment and defense components canonical", () => {
  assert.match(source, /ofc\("concealment_penalty"/);
  assert.match(source, /ofc\("defense_s",s\);ofc\("defense_p",p\);ofc\("defense_i",i\)/);
  assert.doesNotMatch(source, /base\("defense",\[s,p,i\]/);
});

test("legacy outfit import delegates control and CS category rules to the shared OFC adapter", () => {
  assert.match(source, /import\("\.\/outfit-ofc-adapter\.js\?v=1"\)/);
  assert.match(source, /function canonicalModifiers\(item\)/);
  assert.match(source, /normalizeImportedOutfitDetails\(item\.category/);
  assert.doesNotMatch(source, /\["armor","vehicle"\]\.includes\(item\.category\)/);
  assert.doesNotMatch(source, /\["tron","vehicle"\]\.includes\(item\.category\)/);
  assert.match(source, /base\("control_modifier",modifiers\.control_modifier\)/);
  assert.match(source, /base\("cs_modifier",modifiers\.cs_modifier\)/);
});
