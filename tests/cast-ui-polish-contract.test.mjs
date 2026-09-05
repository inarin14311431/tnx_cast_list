import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../css-next/pages/cast-ui-polish.css", import.meta.url), "utf8");
const entry = await readFile(new URL("../css-next/pages/cast-entry.css", import.meta.url), "utf8");
const castHtml = await readFile(new URL("../cast.html", import.meta.url), "utf8");
const castUi = await readFile(new URL("../js/cast-ui.js", import.meta.url), "utf8");

test("desktop cast polish is isolated in the final cascade layer", () => {
  assert.match(entry, /cast-transfer, cast-troop-modal, cast-polish;/);
  assert.match(entry, /@import url\("\.\/cast-ui-polish\.css\?v=2"\) layer\(cast-polish\);/);
  assert.match(css, /@media \(min-width: 1200px\)/);
  assert.doesNotMatch(css, /@media\s*\([^)]*max-width/i);
});

test("desktop cast polish covers the four review targets", () => {
  assert.match(css, /\.cast-header__actions #cast-edit-button/);
  assert.match(css, /:is\(\.cast-quick-sheet-link, \.cast-view-mode-link, \.cast-troops-jump\)/);
  assert.match(css, /\.identity-grid > div:not\(\.cast-character-sheet-link\)/);
  assert.match(css, /\.identity-grid > \.cast-character-sheet-link[\s\S]*grid-column: 4;[\s\S]*grid-row: 2;/);
  assert.match(css, /\.cast-hero[\s\S]*grid-template-columns: minmax\(280px, 360px\) minmax\(0, 1fr\);/);
  assert.match(css, /\.cast-hero__image-panel[\s\S]*height: auto;/);
  assert.match(css, /\.cast-hero__image-frame[\s\S]*aspect-ratio: 3 \/ 4;/);
});

test("cast edit hover keeps readable theme-based text", () => {
  assert.match(css, /#cast-edit-button:is\(:hover, :focus-visible\)[\s\S]*color: var\(--color-text\);/);
  assert.match(css, /#cast-edit-button:is\(:hover, :focus-visible\)[\s\S]*color-mix\(in srgb, var\(--color-accent\) 34%, var\(--color-surface\)\)/);
  assert.match(css, /#cast-edit-button:is\(:hover, :focus-visible\) small[\s\S]*var\(--color-text\)/);
});

test("desktop cast polish keeps the theme system authoritative", () => {
  const pageCssIndex = castHtml.indexOf('./css-next/pages/cast-entry.css?v=8');
  const themeCssIndex = castHtml.indexOf('./css-next/themes/index.css?v=1');
  assert.ok(pageCssIndex >= 0 && themeCssIndex > pageCssIndex);
  assert.match(castHtml, /\.\/js\/theme-registry\.js\?v=1/);
  assert.match(castHtml, /\.\/js\/css-next-theme\.js\?v=8/);
  assert.match(castHtml, /\.\/js\/theme-scope\.js\?v=1/);
  assert.match(css, /var\(--color-accent\)/);
  assert.match(css, /var\(--color-surface\)/);
  assert.match(css, /var\(--color-text\)/);
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i);
});

test("Character Sheet Warehouse link remains active in the polished identity grid", () => {
  assert.match(castUi, /initializeCharacterSheetLinks\(\);/);
  assert.match(castUi, /row\.className = mobile \? "mobile-cast-character-sheet-link" : "cast-character-sheet-link";/);
  assert.match(castUi, /desktopList\.append\(createCharacterSheetLinkRow\(href\)\);/);
  assert.match(castUi, /link\.target = "_blank";/);
  assert.match(css, /\.identity-grid > \.cast-character-sheet-link/);
});
