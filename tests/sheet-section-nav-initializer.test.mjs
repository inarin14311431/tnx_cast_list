import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { assertVersionedMatch } from "./helpers/cache-version.mjs";

const source = await readFile(new URL("../js/sheet-section-nav.js", import.meta.url), "utf8");

test("sheet section navigation uses an explicit initializer", () => {
  assert.match(source, /initializeSheetSectionNav\(\);/);
  assert.match(source, /function initializeSheetSectionNav\(\)/);
});

test("sheet section navigation initialization is idempotent", () => {
  assert.match(source, /nav\.dataset\.tnxSectionNavInitialized === "true"/);
  assert.match(source, /nav\.dataset\.tnxSectionNavInitialized = "true"/);
});

test("sheet section navigation preserves its existing behavior hooks", () => {
  assert.match(source, /new IntersectionObserver/);
  assert.match(source, /scrollIntoView\(\{ behavior: "smooth", block: "start" \}\)/);
  assert.match(source, /history\.replaceState\(null, "", `#\$\{section\.id\}`\)/);
  assertVersionedMatch(source, /import\("\.\/help-ui\.js\?v=VERSION"\)/);
  assertVersionedMatch(source, /import\("\.\/sheet-save-diagnostics\.js\?v=VERSION"\)/);
});
