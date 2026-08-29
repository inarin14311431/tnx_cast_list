import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/sheet-sticky-exp-panel.js", import.meta.url), "utf8");

test("sticky experience panel relies on explicit lifecycle and resize signals", () => {
  assert.doesNotMatch(source, /MutationObserver/);
  assert.match(source, /window\.addEventListener\("load"/);
  assert.match(source, /window\.addEventListener\("tnx:general-master-ready"/);
  assert.match(source, /new ResizeObserver/);
  assert.match(source, /window\.addEventListener\("scroll", queuePanelUpdate/);
});
