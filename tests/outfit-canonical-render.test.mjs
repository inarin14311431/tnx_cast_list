import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const loadSource = await readFile(new URL("../js/sheet-load-normalization.js", import.meta.url), "utf8");
const rendererSource = await readFile(new URL("../js/sheet-outfit-renderer.js", import.meta.url), "utf8");
const tableSource = await readFile(new URL("../js/outfit-tables.js", import.meta.url), "utf8");
const ofcSource = await readFile(new URL("../js/outfit-ofc-fields.js", import.meta.url), "utf8");

test("loaded outfits flatten ofc_details into the editor model", () => {
  assert.match(loadSource, /normalizeImportedOutfitDetails/);
  assert.match(loadSource, /\.\.\.details,\s*\.\.\.outfit/);
  assert.match(loadSource, /_ofc_details:\s*details/);
});

test("outfit renderer emits OFC fields before table conversion", () => {
  for (const field of ["concealment_penalty", "defense_s", "defense_p", "defense_i", "electronic_control", "manufacturer", "page_number"]) {
    assert.match(rendererSource, new RegExp(`data-ofc=\\"\\$\\{key\\}\\"|${field}`));
  }
  assert.match(rendererSource, /data-outfit-ofc-details/);
});

test("table adapter treats rendered OFC controls as native table cells", () => {
  assert.match(tableSource, /OFC_FIELDS=new Set/);
  assert.match(tableSource, /td\.dataset\.ofcCell=key/);
  assert.match(tableSource, /th\.dataset\.ofcHead=key/);
  assert.match(tableSource, /defense_s.*defense_p.*defense_i/);
});

test("OFC compatibility state no longer queries Supabase or inserts fields", () => {
  assert.doesNotMatch(ofcSource, /supabase/);
  assert.doesNotMatch(ofcSource, /from\(["']character_outfits["']\)/);
  assert.doesNotMatch(ofcSource, /createElement\(["']td["']\)/);
  assert.match(ofcSource, /parseEmbeddedDetails/);
});
