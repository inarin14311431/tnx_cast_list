import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/direct-transfer-button.js", import.meta.url), "utf8");

test("bookmarklet transfer observes only page-owned dynamic regions", () => {
  assert.match(source, /function observationRoots\(\)/);
  assert.match(source, /page === "sheet\.html"/);
  assert.match(source, /document\.querySelector\("\.sheet-layout"\)/);
  assert.match(source, /document\.querySelector\("\.exp-panel"\)/);
  assert.match(source, /page === "cast\.html"/);
  assert.match(source, /document\.querySelector\("\.cast-header"\)/);
  assert.match(source, /document\.querySelector\("#mobile-cast-view"\)/);
  assert.match(source, /document\.querySelector\("#cast-content"\)/);
  assert.match(source, /document\.querySelector\("#quick-sheet"\)/);
  assert.match(source, /observationRoots\(\)\.forEach\(root => observer\.observe\(root, \{ childList: true, subtree: true \}\)\)/);
  assert.doesNotMatch(source, /observer\.observe\(document\.body/);
});

test("bookmarklet transfer keeps BM navigation and desktop export order behavior", () => {
  assert.match(source, /const ACTIVE_MODE = "bookmarklet"/);
  assert.match(source, /location\.href = `\.\/mobile-transfer\.html\?id=/);
  assert.match(source, /"transfer-bookmarklet-copy-button"/);
  assert.match(source, /normalizeDesktopExportOrder\(\)/);
  assert.match(source, /import\("\.\/transfer-tsv-export\.js\?v=1"\)/);
});
