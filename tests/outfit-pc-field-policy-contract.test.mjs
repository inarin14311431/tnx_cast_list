import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/outfit-pc-field-policy.js", import.meta.url), "utf8");

test("PC outfit policy consumes the shared outfit contract", () => {
  assert.match(source, /OUTFIT_BASE_FIELDS/);
  assert.match(source, /OUTFIT_FIELD_LABELS/);
  assert.match(source, /normalizeOutfitCategory/);
  assert.match(source, /from "\.\/outfit-contract\.js\?v=2"/);
});

test("PC outfit policy consumes shared legacy concealment parsing directly", () => {
  assert.match(source, /splitLegacyConcealment/);
  assert.match(source, /from "\.\/outfit-legacy-compat\.js\?v=1"/);
  assert.doesNotMatch(source, /from "\.\/outfit-view-model/);
  assert.doesNotMatch(source, /function splitConcealment/);
});

test("PC outfit policy no longer owns an outfit root MutationObserver", () => {
  assert.doesNotMatch(source, /new MutationObserver/);
  assert.match(source, /tnx:outfit-tables-rendered/);
});

test("PC outfit policy derives missing base fields from the canonical base contract", () => {
  assert.match(source, /function extraBaseFields\(category\)/);
  assert.match(source, /OUTFIT_BASE_FIELDS\.filter/);
  assert.doesNotMatch(source, /EXTRA_BASE_FIELDS/);
});
