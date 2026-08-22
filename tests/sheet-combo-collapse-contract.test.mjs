import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const interactions = await readFile(
  new URL("../js/sheet-editor-interactions.js", import.meta.url),
  "utf8"
);
const sheetHtml = await readFile(
  new URL("../sheet.html", import.meta.url),
  "utf8"
);

test("combo section participates in the shared collapse interaction", () => {
  assert.match(sheetHtml, /id="sheet-combo-entry"[^>]*class="[^"]*sheet-section--combos[^"]*is-open/);
  assert.match(sheetHtml, /class="sheet-combo-entry__header"/);
  assert.match(interactions, /\.section-toggle, \.sheet-combo-entry__header/);
  assert.match(interactions, /classList\.add\("section-toggle"\)/);
  assert.match(interactions, /classList\.toggle\("is-open"\)/);
});

test("promoted combo header exposes keyboard and expanded-state semantics", () => {
  assert.match(interactions, /setAttribute\("role", "button"\)/);
  assert.match(interactions, /setAttribute\("tabindex", "0"\)/);
  assert.match(interactions, /setAttribute\("aria-expanded", String\(isOpen\)\)/);
  assert.match(interactions, /event\.key !== "Enter" && event\.key !== " "/);
});

test("combo header reserves room for the shared collapse chevron", () => {
  assert.match(interactions, /toggle\.style\.paddingRight = "58px"/);
  assert.match(interactions, /tag\.style\.marginRight = "10px"/);
});
