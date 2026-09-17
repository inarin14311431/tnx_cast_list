import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");
const [entryCss, emphasisCss] = await Promise.all([
  read("css-next/pages/act-showcase-entry.css"),
  read("css-next/pages/act-showcase-visual-emphasis.css")
]);

test("ACT TRAILER uses one thin caret instead of a combined block glyph", () => {
  assert.match(entryCss.trim().split("\n").at(-1), /act-showcase-visual-emphasis\.css\?v=/);
  assert.match(emphasisCss, /ACT TRAILER caret:[\s\S]*content:""/);
  assert.match(emphasisCss, /ACT TRAILER caret:[\s\S]*width:2px/);
  assert.match(emphasisCss, /ACT TRAILER caret:[\s\S]*height:1\.05em/);
  assert.match(emphasisCss, /ACT TRAILER caret:[\s\S]*background:var\(--showcase-primary\)/);
  assert.match(emphasisCss, /ACT TRAILER caret:[\s\S]*font-size:0/);
});
