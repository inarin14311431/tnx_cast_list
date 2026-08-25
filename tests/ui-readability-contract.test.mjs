import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const castEntry = await readFile(new URL("../css-next/pages/cast-entry.css", import.meta.url), "utf8");
const mobileReadability = await readFile(new URL("../css-next/pages/cast-mobile-readability.css", import.meta.url), "utf8");

test("mobile cast readability layer is loaded after the base mobile stylesheet", () => {
  const base = castEntry.indexOf("cast-mobile.css?v=4");
  const readability = castEntry.indexOf("cast-mobile-readability.css?v=1");
  assert.ok(base >= 0);
  assert.ok(readability > base);
});

test("mobile cast gameplay text is promoted above legacy micro-text sizes", () => {
  assert.match(mobileReadability, /\.mobile-skill-row > strong \{ font-size: 11px;/);
  assert.match(mobileReadability, /\.mobile-outfit-card > strong \{ font-size: 11px;/);
  assert.match(mobileReadability, /\.mobile-combo-card > p \{ font-size: 10px;/);
  assert.match(mobileReadability, /@media \(max-width: 520px\)/);
  assert.match(mobileReadability, /\.mobile-core-skills \{ grid-template-columns: 1fr;/);
});
