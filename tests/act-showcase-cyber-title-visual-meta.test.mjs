import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("act showcase loads the cyberpunk title layer and display helpers through its entries", async () => {
  const [html, entry, bootstrap] = await Promise.all([
    read("act-showcase.html"),
    read("css-next/pages/act-showcase-entry.css"),
    read("js/act-showcase-bootstrap.js")
  ]);
  assert.ok(html.includes("family=Dela+Gothic+One"));
  assert.match(entry, /act-showcase-title-cyberpunk\.css\?v=[^\"']+/);
  assert.match(bootstrap, /act-showcase-visual-caption-code\.js\?v=[^\"']+/);
  assert.match(bootstrap, /act-showcase-tagline-quotes\.js\?v=[^\"']+/);
});

test("cyberpunk title keeps the title as a logo rather than plain gothic text", async () => {
  const css = await read("css-next/pages/act-showcase-title-cyberpunk.css");
  assert.ok(css.includes("Dela Gothic One"));
  assert.ok(css.includes(".neotokyo-sequence__act-title--logo.showcase-fit-title:before"));
  assert.ok(css.includes(".neotokyo-sequence__screen--title-logo:after"));
  assert.ok(css.includes("clip-path:polygon"));
});

test("cast visual caption replaces the duplicate tagline with visual metadata", async () => {
  const [code, quotes] = await Promise.all([
    read("js/act-showcase-visual-caption-code.js"),
    read("js/act-showcase-tagline-quotes.js")
  ]);
  assert.ok(code.includes("ENTRY STYLE //"));
  assert.ok(code.includes("AFFILIATION //"));
  assert.ok(code.includes("poster-v2-visual__meta"));
  assert.ok(code.includes("CAST VISUAL // PUBLIC ARCHIVE"));
  assert.ok(!quotes.includes("poster-v2-visual__caption > span"));
});
