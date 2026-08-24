import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/cast-mobile.js", import.meta.url), "utf8");

test("mobile combo rendering is owned by cast-mobile", () => {
  assert.match(source, /function renderCombos\(items\)/);
  assert.match(source, /items\.map\(renderMobileComboEntry\)/);
  assert.match(source, /function renderMobileComboEntry\(combo\)/);
  assert.match(source, /function renderMobileCounter\(combo\)/);
  assert.match(source, /function renderMobileUsageTracker\(limit\)/);
});

test("mobile combo counters are initialized directly after mobile render", () => {
  assert.match(source, /initializeMobileComboCounters\(root\)/);
  assert.match(source, /function initializeMobileComboCounters\(root\)/);
  assert.match(source, /data-mobile-counter-id/);
  assert.match(source, /data-mobile-counter-reset/);
  assert.match(source, /localStorage\.getItem/);
  assert.match(source, /localStorage\.setItem/);
});

test("mobile combo rendering no longer needs delayed mutation-observer recovery", () => {
  assert.doesNotMatch(source, /mobile combo enhancement failed/);
  assert.doesNotMatch(source, /mobileCombosInitialized/);
  assert.doesNotMatch(source, /setTimeout\(\(\) => observer\.disconnect\(\), 6000\)/);
});
