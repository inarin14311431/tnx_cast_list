import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("troop general skills lock their canonical automatic suit", () => {
  const ui = read("js/troop-editor-ui.js");
  assert.match(ui, /initialGeneralSkillSuit/);
  assert.match(ui, /syncGeneralAutoSuit\(row, base\)/);
  assert.match(ui, /input\.checked = true/);
  assert.match(ui, /input\.disabled = true/);
  assert.match(ui, /data-auto-suit|dataset\.autoSuit/);
});
