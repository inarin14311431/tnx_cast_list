import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("sheet editor loads the current save coordinator through cache-busted assets", async () => {
  const [html, sheet] = await Promise.all([read("sheet.html"), read("js/sheet.js")]);
  assert.match(html, /sheet\.js\?v=114/);
  assert.match(sheet, /sheet-save-coordinator\.js\?v=2/);
});
