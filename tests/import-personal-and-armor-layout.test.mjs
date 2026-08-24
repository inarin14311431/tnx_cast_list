import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("structured personal import values are restored after the base importer finishes", async () => {
  const source = await readFile(new URL("../js/sheet-personal-data.js", import.meta.url), "utf8");
  assert.match(source, /const BASE_IMPORT_EVENT = "tnx:legacy-import-base-finished"/);
  assert.match(source, /let pendingLegacyValues = null/);
  assert.match(source, /document\.addEventListener\(BASE_IMPORT_EVENT/);
  assert.match(source, /applyLegacyValues\(pendingLegacyValues\)/);
  assert.match(source, /pendingLegacyValues = values/);
  assert.match(source, /life_path_origin: \["base\.lifepath\.origin", "base\.lifepath\.experience"/);
});

test("armor total footer aligns itself after outfit and OFC column rendering", async () => {
  const source = await readFile(new URL("../js/armor-grand-total.js", import.meta.url), "utf8");
  assert.match(source, /dataset\.ofcHead === "defense_s"/);
  assert.match(source, /dataset\.ofcHead === "defense_p"/);
  assert.match(source, /dataset\.ofcHead === "defense_i"/);
  assert.match(source, /label\.colSpan = Math\.max\(1, sIndex\)/);
  assert.match(source, /tail\.colSpan = Math\.max\(1, cells\.length - iIndex - 1\)/);
  assert.match(source, /root\.addEventListener\("tnx:outfit-tables-rendered", queue\)/);
  assert.match(source, /requestAnimationFrame\(\(\) => requestAnimationFrame/);
  assert.doesNotMatch(source, /MutationObserver/);
});

test("sheet loads the current armor alignment implementation directly", async () => {
  const source = await readFile(new URL("../sheet.html", import.meta.url), "utf8");
  assert.match(source, /\.\/js\/armor-grand-total\.js\?v=103/);
  assert.doesNotMatch(source, /\.\/js\/armor-grand-total\.js\?v=102/);
});
