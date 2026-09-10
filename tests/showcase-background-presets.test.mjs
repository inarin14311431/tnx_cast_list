import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const generatorHtml = readFileSync(new URL("../showcase-generator.html", import.meta.url), "utf8");
const entryCss = readFileSync(new URL("../css-next/pages/showcase-entry.css", import.meta.url), "utf8");
const presets = readFileSync(new URL("../js/showcase-background-presets.js", import.meta.url), "utf8");
const picker = readFileSync(new URL("../js/showcase-background-preset-picker.js", import.meta.url), "utf8");
const page = readFileSync(new URL("../js/act-showcase-page.js", import.meta.url), "utf8");
const showcaseEntry = readFileSync(new URL("../css-next/pages/act-showcase-entry.css", import.meta.url), "utf8");
const css = readFileSync(new URL("../css-next/pages/showcase-background-presets.css", import.meta.url), "utf8");

test("generator exposes the canonical background preset picker wiring", () => {
  assert.match(generatorHtml, /id="background-preset-grid"/);
  assert.match(generatorHtml, /showcase-background-preset-picker\.js\?v=\d+/);
  assert.match(entryCss, /showcase-background-presets\.css\?v=\d+/);
  assert.doesNotMatch(generatorHtml, /<link[^>]+showcase-background-presets\.css/);
  assert.match(presets, /export const SHOWCASE_BACKGROUND_PRESETS/);
  assert.match(presets, /new URL\("\.\.\/assets\/showcase\/backgrounds\/", import\.meta\.url\)/);
  assert.match(presets, /url\.searchParams\.set\("v", SHOWCASE_BACKGROUND_ASSET_VERSION\)/);
  assert.match(picker, /showcase-background-presets\.js\?v=\d+/);
});

test("preset selection reuses the existing background URL publishing path", () => {
  assert.match(picker, /urlField\.value = preset\.url/);
  assert.match(picker, /fileField\.value = ""/);
  assert.match(picker, /aria-pressed/);
  assert.match(picker, /is-selected/);
});

test("manual background inputs can override a selected preset", () => {
  assert.match(picker, /urlField\.addEventListener\("input"/);
  assert.match(picker, /fileField\?\.addEventListener\("change"/);
  assert.match(picker, /keyField\.value = ""/);
});

test("cinematic presentation applies published background from the canonical showcase model", () => {
  assert.match(page, /const data = await loadPublicShowcase\(slug\)/);
  assert.match(page, /background: safeImageUrl\(data\.background\)/);
  assert.match(page, /applyBackground\(model\.background\)/);
  assert.match(page, /--showcase-background/);
  assert.match(showcaseEntry, /act-showcase-top-background-only\.css\?v=\d+/);
  assert.doesNotMatch(page, /act-showcase-background-resolver/);
});

test("preset UI remains usable without motion", () => {
  assert.match(css, /grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(css, /!important/);
});
