import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const store = await readFile(new URL("../js/cast-data-store.js", import.meta.url), "utf8");
const renderer = await readFile(new URL("../js/cast-outfits.js", import.meta.url), "utf8");
const model = await readFile(new URL("../js/outfit-view-model.js", import.meta.url), "utf8");

test("public outfit data store owns canonical view normalization", () => {
  assert.match(store, /normalizeOutfitListForView/);
  assert.match(store, /return normalizeOutfitListForView\(data \|\| \[\]\)/);
});

test("PC outfit renderer consumes canonical view data without renormalizing DB fields", () => {
  assert.doesNotMatch(renderer, /function normalizeDetails/);
  assert.doesNotMatch(renderer, /function splitLegacyConcealment/);
  assert.doesNotMatch(renderer, /function parseArmorDefense/);
  assert.match(renderer, /numeric\(item\.defense_s\)/);
  assert.match(renderer, /numeric\(item\.defense_p\)/);
  assert.match(renderer, /numeric\(item\.defense_i\)/);
});

test("canonical public view exposes CS modifier without deprecated cs_value alias", () => {
  assert.match(model, /cs_modifier: cs/);
  assert.doesNotMatch(model, /cs_value:\s*cs/);
});
