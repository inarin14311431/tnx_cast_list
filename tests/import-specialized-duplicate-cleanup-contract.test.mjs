import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const cleanup = await readFile(new URL("../js/sheet-import-specialized-cleanup.js", import.meta.url), "utf8");
const features = await readFile(new URL("../js/sheet-features.js", import.meta.url), "utf8");

test("specialized import cleanup removes only deletable duplicate base-prefix rows", () => {
  assert.match(cleanup, /SPECIALIZED_PREFIXES = new Set\(\["製作：", "芸術：", "操縦："\]\)/);
  assert.match(cleanup, /!row\.querySelector\('\[data-delete-skill\]'\)/);
  assert.match(cleanup, /fixedPrefixes\.has\(name\)/);
  assert.match(cleanup, /row\.querySelector\('\[data-delete-skill\]'\)\?\.click\(\)/);
});

test("cleanup runs after legacy import and is loaded by the sheet feature bundle", () => {
  assert.match(cleanup, /tnx:legacy-import-base-finished/);
  assert.match(features, /sheet-import-specialized-cleanup\.js\?v=1/);
});
