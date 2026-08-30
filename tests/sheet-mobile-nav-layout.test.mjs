import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const css = await read("css-next/pages/sheet-mobile-ux.css");
const ux = await read("js/sheet-mobile-ux.js");
const app = await read("js/sheet-mobile-app.js");

test("mobile section navigation shows every item in a wrapped three-column grid", () => {
  assert.match(css, /\.mobile-sheet-nav\{[\s\S]*display:grid;[\s\S]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /\.mobile-sheet-nav\{[\s\S]*overflow:visible/);
  assert.doesNotMatch(css, /\.mobile-sheet-nav\{[\s\S]*overflow-x:auto/);
});

test("mobile combo section uses the same numbered heading style as other sections", () => {
  assert.match(ux, /comboTitle\.textContent!=="07 コンボ"/);
  assert.match(ux, /ensureNavLink\("#mobile-combos-section","07 コンボ"\)/);
});

test("mobile nav normalization is idempotent and observes only the mobile editor root", () => {
  assert.match(ux, /if\(link\.textContent!==label\)link\.textContent=label/);
  assert.doesNotMatch(ux, /\n  link\.textContent=label;\n/);
  assert.match(ux, /const mobileRoot=document\.querySelector\("main"\)/);
  assert.match(ux, /observer\.observe\(mobileRoot,\{childList:true,subtree:true\}\)/);
  assert.doesNotMatch(ux, /observer\.observe\(document\.body,\{childList:true,subtree:true\}\)/);
});

test("active nav highlighting does not scroll the fully visible navigation", () => {
  const active = ux.match(/const activate=id=>\{[\s\S]*?\n  \};/)?.[0] || "";
  assert.doesNotMatch(active, /scrollIntoView/);
  assert.match(app, /sheet-mobile-ux\.js\?v=4/);
});
