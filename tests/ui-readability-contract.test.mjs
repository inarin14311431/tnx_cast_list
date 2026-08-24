import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const castHtml = await readFile(new URL("../cast.html", import.meta.url), "utf8");
const accountHtml = await readFile(new URL("../account.html", import.meta.url), "utf8");
const mobileReadability = await readFile(new URL("../css-next/pages/cast-mobile-readability.css", import.meta.url), "utf8");
const accountHierarchy = await readFile(new URL("../css-next/pages/account-action-hierarchy.css", import.meta.url), "utf8");

test("mobile cast readability layer is loaded after the base mobile stylesheet", () => {
  const base = castHtml.indexOf("cast-mobile.css?v=3");
  const readability = castHtml.indexOf("cast-mobile-readability.css?v=1");
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

test("account cast cards use one consolidated responsive stylesheet", () => {
  assert.match(accountHtml, /account-action-hierarchy\.css\?v=6/);
  assert.doesNotMatch(accountHtml, /account-mobile-compact\.css/);
  assert.doesNotMatch(accountHtml, /account-action-icons\.css/);
  assert.match(accountHierarchy, /\.owned-cast \{[\s\S]*display: grid;/);
  assert.match(accountHierarchy, /grid-template-columns: minmax\(230px, \.8fr\) minmax\(500px, 1\.35fr\)/);
  assert.match(accountHierarchy, /min-height: 46px/);
  assert.match(accountHierarchy, /@media \(max-width: 767px\)[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
});
