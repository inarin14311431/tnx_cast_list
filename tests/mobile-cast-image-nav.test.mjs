import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const ux = await read("js/sheet-mobile-ux.js");
const image = await read("js/sheet-mobile-image.js");

test("cast image remains section 09 and is present in mobile navigation", () => {
  assert.match(image, /<h2>09 キャスト画像<\/h2>/);
  assert.match(ux, /ensureNavLink\("#mobile-image-section","09 キャスト画像"\)/);
});

test("mobile navigation includes the complete numbered tail", () => {
  assert.match(ux, /ensureNavLink\("#mobile-combos-section","07 コンボ"\)/);
  assert.match(ux, /ensureNavLink\("#mobile-snapshots-section","08 スナップショット"\)/);
  assert.match(ux, /ensureNavLink\("#mobile-image-section","09 キャスト画像"\)/);
});
