import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  shouldApplyStyleBaseline,
  resolveStyleBaselineValue
} from "../js/sheet-baseline-adjustment.js";

test("baseline-derived values follow a changed style baseline", () => {
  assert.equal(shouldApplyStyleBaseline(3, 3), true);
  assert.equal(resolveStyleBaselineValue(3, 3, 5), 5);
});

test("zero current values also accept the new baseline", () => {
  assert.equal(shouldApplyStyleBaseline(0, 4), true);
  assert.equal(resolveStyleBaselineValue(0, 4, 2), 2);
});

test("manual overrides are preserved when the style baseline changes", () => {
  assert.equal(shouldApplyStyleBaseline(9, 3), false);
  assert.equal(resolveStyleBaselineValue(9, 3, 5), 9);
});

test("string and blank inputs preserve the current numeric semantics", () => {
  assert.equal(resolveStyleBaselineValue("3", "3", "6"), 6);
  assert.equal(resolveStyleBaselineValue("", 7, 4), 4);
  assert.equal(resolveStyleBaselineValue("8", 0, 2), 8);
});

test("baseline adjustment helper stays DOM-free and sheet delegates overwrite policy", async () => {
  const helperSource = await readFile(new URL("../js/sheet-baseline-adjustment.js", import.meta.url), "utf8");
  const sheetSource = await readFile(new URL("../js/sheet.js", import.meta.url), "utf8");

  assert.doesNotMatch(helperSource, /document\.|window\.|supabase|localStorage|sessionStorage|addEventListener/);
  assert.match(sheetSource, /sheet-baseline-adjustment\.js\?v=1/);
  assert.match(sheetSource, /resolveStyleBaselineValue\(/);
  assert.match(sheetSource, /function adjustBaseline\(/);
});
