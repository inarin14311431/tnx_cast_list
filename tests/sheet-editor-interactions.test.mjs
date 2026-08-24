import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/sheet-editor-interactions.js", import.meta.url), "utf8");

test("sheet editor interactions owns generic edit, toggle and unload lifecycle", () => {
  assert.match(source, /export function initSheetEditorInteractions/);
  assert.match(source, /addEventListener\("input"/);
  assert.match(source, /addEventListener\("change"/);
  assert.match(source, /addEventListener\("click"/);
  assert.match(source, /addEventListener\("beforeunload"/);
  assert.match(source, /input,select,textarea/);
  assert.match(source, /\.section-toggle/);
  assert.match(source, /hasUnsavedChanges\(\)/);
});

test("sheet editor interactions is idempotent per root and window", () => {
  assert.match(source, /new WeakSet\(\)/);
  assert.match(source, /initializedRoots\.has\(root\)/);
  assert.match(source, /initializedWindows\.has\(windowRef\)/);
});

test("classic sheet delegates generic lifecycle binding", async () => {
  const sheetSource = await readFile(new URL("../js/sheet.js", import.meta.url), "utf8");
  assert.match(sheetSource, /sheet-editor-interactions\.js\?v=1/);
  assert.match(sheetSource, /initSheetEditorInteractions\(/);
  assert.doesNotMatch(sheetSource, /document\.addEventListener\("input", onEdit\)/);
  assert.doesNotMatch(sheetSource, /window\.addEventListener\("beforeunload"/);
  assert.doesNotMatch(sheetSource, /function onEdit\(/);
});
