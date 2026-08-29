import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/sheet-sidebar-actions.js", import.meta.url), "utf8");

test("sheet CS card uses an explicit idempotent initializer", () => {
  assert.match(source, /function initializeSheetCsCard\(\)/);
  assert.match(source, /root\.dataset\.tnxCsCardInitialized === '1'/);
  assert.match(source, /root\.dataset\.tnxCsCardInitialized = '1'/);
  assert.match(source, /initializeSheetCsCard\(\);/);
});

test("sheet CS card preserves its existing calculation and synchronization hooks", () => {
  assert.match(source, /Math\.floor\(\(\s*abilityValue\('reason'\) \+\s*abilityValue\('passion'\) \+\s*abilityValue\('life'\)\s*\) \/ 2\)/);
  assert.match(source, /Math\.max\(0, calculatedBase \+ modifier\)/);
  assert.match(source, /modifierInput\.addEventListener\('change'/);
  assert.match(source, /document\.addEventListener\('input'/);
  assert.match(source, /document\.addEventListener\('change'/);
  assert.match(source, /new MutationObserver\(records =>/);
  assert.match(source, /observer\.observe\(abilityGrid, \{ childList: true, subtree: true \}\)/);
  assert.doesNotMatch(source, /observer\.observe\(document\.body/);
});
