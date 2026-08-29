import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/sheet-sticky-exp-panel.js", import.meta.url), "utf8");

test("sticky experience panel keeps explicit lifecycle and resize triggers", () => {
  assert.doesNotMatch(source, /MutationObserver/);
  assert.match(source, /tnx:general-master-ready/);
  assert.match(source, /ResizeObserver/);
});
