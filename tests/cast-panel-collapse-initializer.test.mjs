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

test("cast panel collapse preserves click keyboard and render setup", () => {
  const start = source.indexOf("function initializeCastPanelCollapse");
  const end = source.indexOf("\n})();", start);
  const initializer = source.slice(start, end);

  assert.match(initializer, /panel\.querySelector\(":scope > \.data-panel__header"\)/);
  assert.match(initializer, /panel\.classList\.toggle\("is-collapsed"\)/);
  assert.match(initializer, /header\.addEventListener\("click", toggle\)/);
  assert.match(initializer, /header\.addEventListener\("keydown"/);
  assert.match(initializer, /event\.key === "Enter" \|\| event\.key === " "/);
  assert.match(initializer, /panel\.dataset\.collapseReady = "1"/);
  assert.match(initializer, /tnx:cast-rendered/);
  assert.match(initializer, /applyAfterCastRender/);
  assert.match(initializer, /once: true/);
  assert.doesNotMatch(initializer, /new MutationObserver/);
  assert.doesNotMatch(initializer, /\.observe\(/);
});
