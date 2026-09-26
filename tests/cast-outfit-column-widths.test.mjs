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
  assert.match(entry, /cast-outfit-column-widths\.css\?v=1/);
  assert.match(castHtml, /cast-entry\.css\?v=10/);
  assert.match(castHtml, /cast-outfits\.js\?v=7/);
});
