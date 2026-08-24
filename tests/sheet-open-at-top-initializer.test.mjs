import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/sheet-open-at-top.js", import.meta.url), "utf8");

test("sheet open-at-top uses an explicit idempotent initializer", () => {
  assert.match(source, /initializeSheetOpenAtTop\(\);/);
  assert.match(source, /function initializeSheetOpenAtTop\(\)/);
  assert.match(source, /dataset\.sheetOpenAtTopInitialized===\"true\"/);
  assert.match(source, /dataset\.sheetOpenAtTopInitialized=\"true\"/);
});

test("sheet open-at-top keeps the existing scroll and image-guidance hooks", () => {
  assert.match(source, /addEventListener\(\"pageshow\",scrollTop\)/);
  assert.match(source, /addEventListener\(\"load\"/);
  assert.match(source, /addEventListener\(\"DOMContentLoaded\"/);
  assert.match(source, /一覧・閲覧・アクト紹介では上部基準でトリミングされます。/);
});
