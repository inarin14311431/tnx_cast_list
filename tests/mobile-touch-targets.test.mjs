import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("mobile primary add controls keep a 44px touch target", async () => {
  const css = await read("css-next/pages/sheet-mobile-ui.css");
  assert.match(css, /\.mobile-section-add\{[^}]*min-height:44px/);
});

test("mobile ability value cells keep a 44px tap target", async () => {
  const css = await read("css-next/pages/sheet-mobile-ability.css");
  assert.match(css, /\.mobile-ability-matrix__value\{[^}]*min-height:44px/);
});

test("mobile general skill rows keep a 44px tap target", async () => {
  const css = await read("css-next/pages/sheet-mobile-skills.css");
  assert.match(css, /\.mobile-general-row--button\{[^}]*min-height:44px/);
});

test("mobile style skill ordering controls are finger-sized", async () => {
  const css = await read("css-next/pages/sheet-mobile-skills.css");
  assert.match(css, /\.mobile-style-skill-row\{[^}]*grid-template-columns:minmax\(0,1fr\) 44px/);
  assert.match(css, /\.mobile-style-skill-row__actions button\{[^}]*min-width:44px;min-height:44px/);
  assert.match(css, /\.mobile-style-separator__actions button\{[^}]*min-width:44px;min-height:44px/);
});

test("mobile outfit ordering controls are finger-sized", async () => {
  const css = await read("css-next/pages/sheet-mobile-outfit.css");
  assert.match(css, /\.mobile-outfit-order-row\{[^}]*grid-template-columns:minmax\(0,1fr\) 44px/);
  assert.match(css, /\.mobile-outfit-order-row__actions button\{[^}]*min-width:44px;min-height:44px/);
});
