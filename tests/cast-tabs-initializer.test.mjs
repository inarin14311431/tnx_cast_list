import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/cast-view-controls.js", import.meta.url), "utf8");

test("cast tabs use an explicit idempotent initializer", () => {
  assert.match(source, /function initializeCastTabs\(\)/);
  assert.match(source, /const htmlRoot = document\.documentElement/);
  assert.match(source, /htmlRoot\.dataset\.castTabsInitialized === "1"/);
  assert.match(source, /htmlRoot\.dataset\.castTabsInitialized = "1"/);
  assert.match(source, /initializeCastTabs\(\);/);
});

test("cast tabs preserve click keyboard and combo-jump behavior", () => {
  assert.match(source, /const TAB_SELECTOR = "\.cast-tab\[data-tab\]"/);
  assert.match(source, /const PANEL_SELECTOR = "\.cast-tab-panel\[data-panel\]"/);
  assert.match(source, /data-cast-jump="combo"/);
  assert.match(source, /document\.addEventListener\("click"/);
  assert.match(source, /document\.addEventListener\("keydown"/);
  assert.match(source, /\["ArrowLeft", "ArrowRight", "Home", "End"\]/);
  assert.match(source, /activateTab\("session"\)/);
  assert.match(source, /scrollIntoView\(\{ behavior: "smooth", block: "start" \}\)/);
  assert.match(source, /DOMContentLoaded", initializeTabs, \{ once: true \}/);
});
