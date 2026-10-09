import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const definitions = await readFile(new URL("../js/cast-view-definitions.js", import.meta.url), "utf8");
const outfits = await readFile(new URL("../js/cast-outfits.js", import.meta.url), "utf8");
const entry = await readFile(new URL("../css-next/pages/cast-entry.css", import.meta.url), "utf8");
const layout = await readFile(new URL("../css-next/pages/cast-outfit-column-widths.css", import.meta.url), "utf8");
const castHtml = await readFile(new URL("../cast.html", import.meta.url), "utf8");

test("cyberware IANUS headers use compact labels", () => {
  assert.match(definitions, /ianus_surface:\s*"表"/);
  assert.match(definitions, /ianus_deep:\s*"深"/);
  assert.match(definitions, /ianus_none:\s*"無"/);
  assert.doesNotMatch(definitions, /IANUS\s+(表|深|無)/);
});

test("cyberware IANUS columns match the electronic-control width", () => {
  assert.match(layout, /cast-outfit-col--ianus_surface[\s\S]*?width:\s*48px/);
  assert.match(layout, /cast-outfit-col--ianus_deep[\s\S]*?width:\s*48px/);
  assert.match(layout, /cast-outfit-col--ianus_none[\s\S]*?width:\s*48px/);
});

test("tron CS modifier stays compact and description receives remaining width", () => {
  assert.match(layout, /data-outfit-category="tron"[\s\S]*?cast-outfit-col--cs_modifier[\s\S]*?width:\s*56px/);
  assert.match(layout, /data-outfit-category="cyberware"[\s\S]*?data-outfit-category="tron"[\s\S]*?cast-outfit-col--description[\s\S]*?width:\s*auto/);
  assert.match(layout, /data-outfit-category="tron"\]\s*\{[\s\S]*?min-width:\s*1248px/);
});

test("cast page loads the refreshed outfit definitions and layout assets", () => {
  assert.match(outfits, /cast-view-definitions\.js\?v=3/);
  assert.match(entry, /cast-outfit-column-widths\.css\?v=3/);
  assert.match(castHtml, /cast-entry\.css\?v=28/);
  assert.match(castHtml, /cast-outfits\.js\?v=10/);
});

test("items without a description get no tablet description row, and name/slot cells wrap on tablet", () => {
  assert.match(outfits, /if \(text === "—"\) return "";/);
  assert.match(layout, /td\.cast-outfit-col--name, td\.cast-outfit-col--slot\) \{ white-space: normal;/);
  assert.match(layout, /\.cast-outfit-value \{ white-space: normal;/);
});

const castCss = await readFile(new URL("../css-next/pages/cast.css", import.meta.url), "utf8");
const controls = await readFile(new URL("../js/cast-view-controls.js", import.meta.url), "utf8");
const tabletBlock = layout.slice(layout.indexOf("@media screen and (min-width: 768px) and (max-width: 1024px)"));

test("tablet layout moves the description into a row under each item", () => {
  assert.match(outfits, /<tr class="cast-outfit-description-row"><td colspan="\$\{colspan\}"/);
  assert.match(outfits, /const colspan = schema\.length - 2;/);
  assert.match(outfits, /\$\{createDescriptionRow\(schema, source\)\}/);
  assert.match(castCss, /\.cast-outfit-table \.cast-outfit-description-row[^{]*\{ display: none; \}/);
  assert.match(tabletBlock, /\.cast-outfit-table \.cast-outfit-description-row \{ display: table-row; \}/);
  assert.match(tabletBlock, /\.cast-outfit-col--description \{ display: none; \}/);
  assert.match(tabletBlock, /\.cast-outfit-table \{\s*min-width: 0;/);
});

test("tablet rules are screen-only so print never shows the description row", () => {
  assert.ok(tabletBlock.startsWith("@media screen and (min-width: 768px) and (max-width: 1024px)"));
});

test("armor footer keeps a wide and a narrow tail cell so the tablet footer matches the visible columns", () => {
  assert.match(outfits, /cast-armor-total-tail--wide/);
  assert.match(outfits, /colspan="\$\{tail - 1\}" class="cast-armor-total-tail cast-armor-total-tail--narrow"/);
  assert.match(tabletBlock, /\.cast-armor-total-tail--wide \{ display: none; \}/);
  assert.match(tabletBlock, /\.cast-armor-total-tail--narrow \{ display: table-cell; \}/);
});

test("both description copies expand together and every bulk toggle stays in sync", () => {
  assert.match(controls, /function pairedDescriptionField\(field\)/);
  assert.match(controls, /if \(paired\) applyDescriptionState\(paired, expanded\)/);
  assert.match(controls, /function updateButtons\(scope, expanded\)/);
  assert.match(outfits, /cast-outfit-title__toggle/);
});
