import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../css-next/pages/cast-desktop-layout.css", import.meta.url), "utf8");
const entry = await readFile(new URL("../css-next/pages/cast-entry.css", import.meta.url), "utf8");
const castHtml = await readFile(new URL("../cast.html", import.meta.url), "utf8");
const castUi = await readFile(new URL("../js/cast-ui.js", import.meta.url), "utf8");

test("desktop cast layout is a canonical final cascade layer", () => {
  assert.match(entry, /cast-transfer, cast-troop-modal, cast-desktop;/);
  assert.match(entry, /cast-desktop-layout\.css\?v=1/);
  assert.doesNotMatch(entry, /polish/);
  assert.match(css, /@media \(min-width: 1200px\)/);
  assert.doesNotMatch(css, /@media\s*\([^)]*max-width/i);
});

test("desktop cast layout retains the four approved review targets", () => {
  assert.match(css, /\.cast-header__actions #cast-edit-button/);
  assert.match(css, /\.identity-grid > div:not\(\.cast-character-sheet-link\)/);
  assert.match(css, /\.identity-grid > \.cast-character-sheet-link[\s\S]*grid-column: 4;[\s\S]*grid-row: 2;/);
  assert.match(css, /\.cast-hero[\s\S]*grid-template-columns: minmax\(280px, 360px\) minmax\(0, 1fr\);/);
  assert.match(css, /\.cast-hero__image-frame[\s\S]*aspect-ratio: 3 \/ 4;/);
});

test("desktop cast layout remains theme-driven", () => {
  assert.match(css, /var\(--color-accent\)/);
  assert.match(css, /var\(--color-surface\)/);
  assert.match(css, /var\(--color-text\)/);
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i);
  assert.doesNotMatch(css, /body\[data-page="account\.html"\]/);
  const pageCssIndex = castHtml.indexOf('./css-next/pages/cast-entry.css?v=8');
  const themeCssIndex = castHtml.indexOf('./css-next/themes/index.css?v=1');
  assert.ok(pageCssIndex >= 0 && themeCssIndex > pageCssIndex);
});

test("Character Sheet Warehouse link remains active in the canonical identity grid", () => {
  assert.match(castUi, /initializeCharacterSheetLinks\(\);/);
  assert.match(castUi, /desktopList\.append\(createCharacterSheetLinkRow\(href\)\);/);
  assert.match(castUi, /link\.target = "_blank";/);
  assert.match(css, /\.identity-grid > \.cast-character-sheet-link/);
});
