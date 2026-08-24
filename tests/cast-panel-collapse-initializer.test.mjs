import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/cast-view-controls.js", import.meta.url), "utf8");

test("cast panel collapse uses an explicit idempotent initializer", () => {
  assert.match(source, /function initializeCastPanelCollapse\(\)/);
  assert.match(source, /root\.dataset\.castPanelCollapseInitialized === "1"/);
  assert.match(source, /root\.dataset\.castPanelCollapseInitialized = "1"/);
  assert.match(source, /initializeCastPanelCollapse\(\);/);
});

test("cast panel collapse preserves click keyboard and mutation setup", () => {
  assert.match(source, /panel\.querySelector\(":scope > \.data-panel__header"\)/);
  assert.match(source, /panel\.classList\.toggle\("is-collapsed"\)/);
  assert.match(source, /header\.addEventListener\("click", toggle\)/);
  assert.match(source, /header\.addEventListener\("keydown"/);
  assert.match(source, /event\.key === "Enter" \|\| event\.key === " "/);
  assert.match(source, /panel\.dataset\.collapseReady = "1"/);
  assert.match(source, /new MutationObserver\(setup\)\.observe\(root, \{ childList: true, subtree: true \}\)/);
});
