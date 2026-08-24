import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/style-mark-cycle.js", import.meta.url), "utf8");

test("style mark cycle exposes an explicit initializer", () => {
  assert.match(source, /function initializeStyleMarkCycle\(\)/);
  assert.match(source, /initializeStyleMarkCycle\(\);/);
});

test("style mark cycle initialization is idempotent", () => {
  assert.match(source, /root\.dataset\.tnxStyleMarkCycleInitialized==="true"/);
  assert.match(source, /root\.dataset\.tnxStyleMarkCycleInitialized="true"/);
});

test("style mark cycle preserves mark cycling and load synchronization", () => {
  assert.match(source, /const MARKS=\["","◎","●","◎●"\]/);
  assert.match(source, /control\.addEventListener\("click"/);
  assert.match(source, /markSelect\.addEventListener\("change",queueSync\)/);
  assert.match(source, /new MutationObserver\(queueSync\)\.observe\(status/);
});
