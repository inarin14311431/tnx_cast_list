import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/cast-outfits.js", import.meta.url), "utf8");

test("cast outfits uses an explicit idempotent initializer", () => {
  assert.match(source, /if \(container\) initializeCastOutfits\(\)/);
  assert.match(source, /async function initializeCastOutfits\(\)/);
  assert.match(source, /container\.dataset\.castOutfitsInitialized === "1"/);
  assert.match(source, /container\.dataset\.castOutfitsInitialized = "1"/);
});

test("cast outfits preserves load, ready wait, and render flow", () => {
  assert.match(source, /const outfits = await getOutfits\(\)/);
  assert.match(source, /await waitForCastReady\(\)/);
  assert.match(source, /render\(outfits\)/);
  assert.match(source, /new MutationObserver/);
  assert.match(source, /attributeFilter: \["hidden"\]/);
});

test("cast outfits keeps armor totals and description controls", () => {
  assert.match(source, /category === "armor" \? armorTotals\(items\) : null/);
  assert.match(source, /防御値合計/);
  assert.match(source, /outfit-description-toggle-all/);
  assert.match(source, /outfit-description-expandable/);
});
