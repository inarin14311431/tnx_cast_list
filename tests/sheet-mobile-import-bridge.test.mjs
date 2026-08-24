import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/sheet-mobile-import.js", import.meta.url), "utf8");

test("mobile import persists a completed PC iframe import before reloading mobile state", () => {
  assert.match(source, /legacy-import-message/);
  assert.match(source, /IMPORT_SUCCESS_PREFIX/);
  assert.match(source, /TNXSheetSaveState/);
  assert.match(source, /requestSave\(\)/);
  assert.match(source, /waitForSaved\(30000\)/);
  assert.match(source, /location\.reload\(\)/);
});

test("mobile import does not persist an incomplete or manually closed PC import", () => {
  assert.match(source, /if \(!completedSuccessfully\(frame\)\)/);
  assert.match(source, /window\.setTimeout\(closeOuter, 0\)/);
});
