import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/cast-mobile.js", import.meta.url), "utf8");

test("mobile cast keeps its explicit mobile-only entry point", () => {
  assert.match(source, /async function initializeMobileCast\(\)/);
  assert.match(source, /params\.get\("mobile"\)!=="1"/);
  assert.match(source, /else\{initializeMobileCast\(\);\}/);
  assert.match(source, /document\.body\?\.classList\.add\("is-mobile-cast-view"\)/);
  assert.match(source, /document\.querySelector\("#mobile-cast-view"\)/);
});

test("mobile cast initializer is idempotent", () => {
  assert.match(source, /root\.dataset\.mobileCastInitialized==="1"/);
  assert.match(source, /root\.dataset\.mobileCastInitialized="1"/);
});

test("mobile cast preserves data loading render and transfer synchronization", () => {
  assert.match(source, /Promise\.all\(\[getCharacter\(\),getSkills\(\),getOutfits\(\),getCombos\(\)\]\)/);
  assert.match(source, /render\(root,c,s,o,b\)/);
  assert.match(source, /window\.TNXDirectTransfer\?\.sync\(root\)/);
  assert.match(source, /root\.querySelectorAll\("img"\)/);
  assert.match(source, /assets\/placeholders\/scan-failed\.webp/);
});
