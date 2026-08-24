import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { initSheetStyleInteractions } from "../js/sheet-style-interactions.js";

test("style interactions initializer is idempotent and filters style controls", () => {
  const listeners = [];
  const root = {
    dataset: {},
    addEventListener(type, listener) { listeners.push([type, listener]); }
  };
  let calls = 0;
  initSheetStyleInteractions({ root, onStyleChange: () => { calls += 1; } });
  initSheetStyleInteractions({ root, onStyleChange: () => { calls += 1; } });
  assert.equal(listeners.length, 1);
  const [, listener] = listeners[0];
  listener({ target: { matches: selector => selector === '[id^="style-"]' } });
  listener({ target: { matches: () => false } });
  assert.equal(calls, 1);
});

test("classic sheet delegates style-grid change binding", async () => {
  const source = await readFile(new URL("../js/sheet.js", import.meta.url), "utf8");
  assert.match(source, /sheet-style-interactions\.js\?v=1/);
  assert.match(source, /initSheetStyleInteractions/);
  assert.doesNotMatch(source, /#style-grid"\)\.addEventListener\("change"/);
});
