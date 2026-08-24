import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/tnx-direct-transfer-data.js", import.meta.url), "utf8");

test("direct transfer consumes the shared normalized outfit view model", () => {
  assert.match(source, /import \{ normalizeOutfitForView \} from "\.\/outfit-view-model\.js\?v=2"/);
  assert.match(source, /outfits: \(outfits \|\| \[\]\)\.map\(normalizeOutfitForView\)/);
  assert.match(source, /outfits\.map\(normalizeOutfitForView\)/);
  assert.match(source, /const normalized = normalizeOutfitForView\(outfit\)/);
});

test("direct transfer no longer owns concealment or defense normalization", () => {
  assert.doesNotMatch(source, /function normalizeOutfit\(/);
  assert.doesNotMatch(source, /function splitConcealment\(/);
  assert.doesNotMatch(source, /function parseDefense\(/);
});

test("Character Sheets mapping consumes canonical normalized fields", () => {
  assert.match(source, /concealA: nullable\(normalized\.concealment \|\| legacy\.concealA\)/);
  assert.match(source, /concealB: nullable\(normalized\.concealment_penalty \|\| legacy\.concealB\)/);
  assert.match(source, /control: nullable\(normalized\.control_modifier \|\| legacy\.control\)/);
  assert.match(source, /protecS: nullable\(normalized\.defense_s \|\| legacy\.protecS\)/);
  assert.match(source, /protecP: nullable\(normalized\.defense_p \|\| legacy\.protecP\)/);
  assert.match(source, /protecI: nullable\(normalized\.defense_i \|\| legacy\.protecI\)/);
});
