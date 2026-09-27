import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../css-next/pages/cast-desktop-layout.css", import.meta.url), "utf8");
const castCss = await readFile(new URL("../css-next/pages/cast.css", import.meta.url), "utf8");
const entry = await readFile(new URL("../css-next/pages/cast-entry.css", import.meta.url), "utf8");
const castHtml = await readFile(new URL("../cast.html", import.meta.url), "utf8");
const castUi = await readFile(new URL("../js/cast-ui.js", import.meta.url), "utf8");

test("desktop cast layout is a canonical final cascade layer", () => {
  assert.match(entry, /cast-transfer, cast-troop-modal, cast-desktop, cast-style-table;/);
  assert.match(entry, /cast-desktop-layout\.css\?v=5/);
  assert.doesNotMatch(entry, /polish/);
  assert.match(css, /@media \(min-width: 1200px\)/);
  assert.doesNotMatch(css, /@media\s*\([^)]*max-width/i);
});

test("hero content is owned by cast.css, not re-styled by the desktop layer", () => {
  assert.doesNotMatch(css, /\.cast-name-|\.identity-grid|\.cast-summary|\.cast-character-sheet-link/);
  assert.match(css, /\.cast-hero__identity \{/);
});

test("styles and divine works share one bilingual section heading grammar; the name has none", () => {
  assert.match(castHtml, /<header class="cast-hero-heading"><h2 id="cast-style-heading">スタイル <small>STYLE<\/small><\/h2><span class="cast-hero-heading__meta" aria-hidden="true">STYLE SLOT<\/span><\/header>/);
  assert.match(castHtml, /<header class="cast-hero-heading"><h2 id="cast-divine-heading">神業 <small>DIVINE WORK<\/small><\/h2><span class="cast-hero-heading__meta" aria-hidden="true">AUTHORITY CHANNEL \/\/ ONLINE<\/span><\/header>/);
  assert.doesNotMatch(castHtml, /cast-name-heading|名前 <small>NAME<\/small>/);
  assert.match(castCss, /\.cast-hero-heading h2 small \{ color: var\(--color-accent\);/);
});

test("primary and secondary identity labels share one accent hierarchy", () => {
  assert.match(castHtml, /class="identity-label">プレイヤー <small>PLAYER<\/small>/);
  assert.match(castHtml, /class="identity-label">所属 <small>AFFILIATION<\/small>/);
  assert.match(castHtml, /class="identity-label">市民ランク <small>RANK<\/small>/);
  assert.match(castHtml, /class="identity-label">消費経験点 <small>EXP<\/small>/);
  assert.match(castCss, /\.identity-grid dt \{[^}]*font: 800 \.7rem\/1\.2 var\(--font-sans\);/);
  assert.match(castCss, /\.identity-grid dt small \{ color: var\(--color-accent\); font: 700 \.72em\/1 var\(--font-data\);/);
});

test("desktop cast layout retains the approved header target; the hero column width is owned by cast.css", () => {
  assert.match(css, /\.cast-header__actions #cast-edit-button/);
  assert.doesNotMatch(css, /grid-template-columns:\s*minmax\(280px/);
  assert.match(castCss, /\.cast-hero \{[^}]*grid-template-columns: minmax\(280px, 360px\) minmax\(0, 1fr\);/);
  assert.match(castCss, /@media \(min-width: 1200px\) \{[\s\S]*\.cast-hero \{ align-items: start; gap: 24px; \}[\s\S]*\.cast-hero__image-panel \{ width: 100%; max-width: 360px;[\s\S]*\.cast-hero__image-frame \{ width: 100%; height: auto; min-height: 0; aspect-ratio: 3 \/ 4; \}/);
});

test("desktop cast layout remains theme-driven", () => {
  assert.match(css, /var\(--color-accent\)/);
  assert.match(css, /var\(--color-surface\)/);
  assert.match(css, /var\(--color-text\)/);
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i);
  assert.doesNotMatch(css, /body\[data-page="account\.html"\]/);
  const pageCssIndex = castHtml.indexOf('./css-next/pages/cast-entry.css?v=17');
  const themeCssIndex = castHtml.indexOf('./css-next/themes/index.css?v=1');
  assert.ok(pageCssIndex >= 0 && themeCssIndex > pageCssIndex);
});

test("external character sheet link remains active on desktop and mobile", () => {
  assert.match(castUi, /initializeCharacterSheetLinks\(\);/);
  assert.match(castUi, /desktopSlot\.append\(createCharacterSheetLink\(href\)\);/);
  assert.match(castUi, /mobileList\.append\(createCharacterSheetLinkRow\(href\)\);/);
  assert.equal(castUi.match(/link\.target = "_blank";/g)?.length, 2);
  assert.equal(castUi.match(/link\.rel = "noopener noreferrer";/g)?.length, 2);
});
