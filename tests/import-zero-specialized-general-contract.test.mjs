import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const importer=await readFile(new URL("../js/sheet-import.js",import.meta.url),"utf8");
const sheet=await readFile(new URL("../sheet.html",import.meta.url),"utf8");

test("zero-level specialized general import clears stale fixed-slot specialization",()=>{
  assert.match(importer,/async function resetSpecializedGeneralRows\(\)/);
  assert.match(importer,/GENERAL_SPECIALIZATION_PREFIXES/);
  assert.match(importer,/!candidate\.querySelector\('\[data-delete-skill\]'\)/);
  assert.match(importer,/name:prefix,level:0,s:false,c:false,h:false,d:false,free_level:0/);
  assert.match(importer,/await resetSpecializedGeneralRows\(\);/);
});

test("desktop and mobile iframe fetch the refreshed importer",()=>{
  assert.match(sheet,/sheet-import\.js\?v=103/);
});
