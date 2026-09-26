import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/cast-view-controls.js", import.meta.url), "utf8");

test("cast summary control uses an explicit idempotent initializer", () => {
  assert.match(source, /function initializeCastSummaryControl\(\)/);
  assert.match(source, /panel\.dataset\.summaryControlInitialized === "1"/);
  assert.match(source, /panel\.dataset\.summaryControlInitialized = "1"/);
  assert.match(source, /initializeCastSummaryControl\(\);/);
});

test("cast summary control preserves expansion and measurement hooks", () => {
  const start = source.indexOf("function initializeCastSummaryControl");
  const end = source.indexOf("\n})();", start);
  const initializer = source.slice(start, end);

  assert.match(initializer, /toggle\.addEventListener\("click"/);
  assert.match(initializer, /tnx:cast-rendered/);
  assert.match(initializer, /applyAfterCastRender/);
  assert.match(initializer, /once: true/);
  assert.doesNotMatch(initializer, /new MutationObserver/);
  assert.doesNotMatch(initializer, /observe\(summary/);
  assert.match(initializer, /window\.addEventListener\("resize", scheduleMeasure, \{ passive: true \}\)/);
  assert.match(initializer, /toggle\.hidden = summary\.scrollHeight <= summary\.clientHeight \+ 1/);
});
