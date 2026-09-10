import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("act showcase loads the dense PC ornament layer after the base ornament", async () => {
  const entry = await read("css-next/pages/act-showcase-entry.css");
  const base = entry.indexOf("act-showcase-ornament.css");
  const plus = entry.indexOf("act-showcase-ornament-plus.css");
  assert.ok(base >= 0 && plus > base);
});

test("dense ornament layer stays PC-focused and covers all major poster regions", async () => {
  const css = await read("css-next/pages/act-showcase-ornament-plus.css");
  assert.match(css, /@media \(min-width:1100px\)/);
  assert.match(css, /\.opening-content h1:after/);
  assert.match(css, /\.poster-ornament__seal:after/);
  assert.match(css, /\.poster-v2-panel--visual/);
  assert.match(css, /\.poster-v2-panel--profile/);
  assert.match(css, /\.poster-v2-panel--handout/);
  assert.match(css, /\.poster-v2-panel--credits/);
  assert.match(css, /\.poster-v2-roster/);
});

test("dense ornament animations respect reduced motion", async () => {
  const css = await read("css-next/pages/act-showcase-ornament-plus.css");
  assert.match(css, /prefers-reduced-motion:no-preference/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});
