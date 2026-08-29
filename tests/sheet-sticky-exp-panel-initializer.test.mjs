import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/sheet-sticky-exp-panel.js", import.meta.url), "utf8");

test("sticky exp panel uses an explicit initializer", () => {
  assert.match(source, /function initializeSheetStickyExpPanel\(\)/);
  assert.match(source, /initializeSheetStickyExpPanel\(\);/);
});

test("sticky exp panel initialization is idempotent", () => {
  assert.match(source, /root\.dataset\.tnxStickyExpPanelInitialized === "true"/);
  assert.match(source, /root\.dataset\.tnxStickyExpPanelInitialized = "true"/);
});

test("sticky exp panel preserves its layout and readiness hooks", () => {
  assert.match(source, /--sheet-editor-sticky-offset/);
  assert.match(source, /--sheet-editor-exp-shift/);
  assert.match(source, /window\.addEventListener\("scroll", queuePanelUpdate/);
  assert.match(source, /window\.addEventListener\("tnx:general-master-ready"/);
  assert.doesNotMatch(source, /MutationObserver/);
  assert.match(source, /new ResizeObserver/);
});
