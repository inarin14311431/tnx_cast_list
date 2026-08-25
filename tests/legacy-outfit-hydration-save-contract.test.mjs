import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("sheet save state waits for OFC outfit hydration before settling old casts", async () => {
  const source = await read("js/sheet-save-coordinator.js");
  assert.ok(source.includes('const OUTFIT_ROOT_SELECTOR = "#outfit-list"'));
  assert.ok(source.includes("outfitEditorIsHydrated"));
  assert.ok(source.includes('OUTFIT_READY_FIELD_SELECTOR = \'[data-ofc="manufacturer"]\''));
  assert.ok(source.includes("beginHydrationSettle"));
  assert.match(source, /markLoading\([^)]*\)\s*\{[\s\S]*beginHydrationSettle\(\)/);
});

test("hydration settling never clears a trusted user edit", async () => {
  const source = await read("js/sheet-save-coordinator.js");
  assert.ok(source.includes("trustedEditDuringHydration"));
  assert.match(source, /event\?\.isTrusted/);
  assert.match(source, /if \(trustedEditDuringHydration\) return;/);
});
