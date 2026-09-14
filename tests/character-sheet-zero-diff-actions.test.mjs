import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../css-next/components/character-sheet-compare.css", import.meta.url), "utf8");
const entry = await readFile(new URL("../css-next/pages/sheet-entry.css", import.meta.url), "utf8");

test("zero-diff comparison hides choice and copy actions", () => {
  assert.match(css, /\.character-sheet-compare-dialog:not\(:has\(\.character-sheet-compare-overview ul\)\) \.character-sheet-compare-choice,\s*\.character-sheet-compare-dialog:not\(:has\(\.character-sheet-compare-overview ul\)\) #compare-copy\{display:none\}/);
  assert.match(css, /\.character-sheet-compare-dialog:not\(:has\(\.character-sheet-compare-overview ul\)\) \.character-sheet-compare-actions\{justify-content:flex-end\}/);
});

test("comparison choices remain visible when differences are present", () => {
  assert.match(css, /\.character-sheet-compare-choice\{display:grid;/);
  assert.match(css, /\.character-sheet-compare-overview ul\{display:grid;/);
});

test("comparison stylesheet cache generation includes zero-diff rules", () => {
  assert.match(entry, /character-sheet-compare\.css\?v=3/);
});
