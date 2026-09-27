import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const castCss = await readFile(new URL("../css-next/pages/cast.css", import.meta.url), "utf8");
const details = await readFile(new URL("../css-next/pages/cast-view-details.css", import.meta.url), "utf8");
const desktopLayout = await readFile(new URL("../css-next/pages/cast-desktop-layout.css", import.meta.url), "utf8");
const entry = await readFile(new URL("../css-next/pages/cast-entry.css", import.meta.url), "utf8");
const castHtml = await readFile(new URL("../cast.html", import.meta.url), "utf8");
const castUi = await readFile(new URL("../js/cast-ui.js", import.meta.url), "utf8");

test("desktop external sheet link has its own slot directly under the identity facts", () => {
  assert.match(castHtml, /<\/dl><div id="cast-character-sheet-slot" class="cast-hero__sheet-link" hidden><\/div><\/div><\/section>/);
  assert.match(castUi, /desktopSlot\.append\(createCharacterSheetLink\(href\)\);/);
  assert.match(castUi, /desktopSlot\.hidden = false;/);
});

test("desktop external sheet link is right-aligned with a 44px tap target", () => {
  assert.match(castCss, /\.cast-hero__sheet-link \{ display: flex; justify-content: flex-end;/);
  assert.match(castCss, /\.cast-character-sheet-link \{[^}]*min-height: 44px;/);
  assert.match(castUi, /<span>外部シートを開く<\/span><small>CHARACTER SHEET<\/small>/);
});

test("no layer re-pins the link inside the identity grid", () => {
  for (const css of [castCss, details, desktopLayout]) {
    assert.doesNotMatch(css, /\.identity-grid > \.cast-character-sheet-link/);
  }
});

test("cast viewer cache generations include the placement update", () => {
  assert.match(entry, /cast-view-details\.css\?v=6/);
  assert.match(castHtml, /cast-entry\.css\?v=20/);
});
