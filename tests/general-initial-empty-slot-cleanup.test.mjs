import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/general-initial-empty-slot-cleanup.js", import.meta.url), "utf8");

test("general startup cleanup exposes an explicit idempotent initializer", () => {
  assert.match(source, /function initializeGeneralInitialEmptySlotCleanup\(\)/);
  assert.match(source, /if \(generalInitialEmptySlotCleanupInitialized\) return;/);
  assert.match(source, /generalInitialEmptySlotCleanupInitialized = true;/);
});

test("general startup cleanup preserves delayed startup and mutation cleanup behavior", () => {
  assert.match(source, /setTimeout\(initializeGeneralInitialEmptySlotCleanup, 80\)/);
  assert.match(source, /new MutationObserver\(\(\) => removeRecordedGeneralInitialEmptySlotRows\(root\)\)/);
  assert.match(source, /observe\(root, \{ childList: true, subtree: true \}\)/);
  assert.match(source, /DOMContentLoaded", initializeGeneralInitialEmptySlotCleanup, \{ once: true \}/);
});
