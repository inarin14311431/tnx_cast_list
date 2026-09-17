import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");
const [emphasisCss, entryCss, cinematicHtml] = await Promise.all([
  read("css-next/pages/act-showcase-visual-emphasis.css"),
  read("css-next/pages/act-showcase-entry.css"),
  read("act-showcase.html")
]);

test("handout terminal restores theme-aware neon glow while intron stays crisp", () => {
  assert.match(emphasisCss, /neotokyo-sequence__handout-panel \.neotokyo-sequence__readout/);
  assert.match(emphasisCss, /rgba\(var\(--showcase-primary-rgb\),\.34\)/);
  assert.match(emphasisCss, /rgba\(var\(--showcase-secondary-rgb\),\.24\)/);
  assert.doesNotMatch(emphasisCss, /!important/);
  assert.match(emphasisCss, /data-showcase-theme="intron"[\s\S]*text-shadow:none/);
});

test("opening keeps ACT background visible under a lighter location-preserving overlay", () => {
  assert.match(emphasisCss, /has-showcase-background \.scene-opening:before/);
  assert.match(emphasisCss, /linear-gradient\(180deg,rgba\(var\(--showcase-bg-rgb\),\.16\),rgba\(var\(--showcase-bg-rgb\),\.50\)\)/);
  assert.match(emphasisCss, /var\(--showcase-background\)/);
  assert.match(emphasisCss, /brightness\(1\.02\)/);
  assert.match(emphasisCss, /opening-content:before[\s\S]*rgba\(var\(--showcase-surface-rgb\),\.66\)[\s\S]*rgba\(var\(--showcase-surface-rgb\),\.26\)/);
  assert.match(emphasisCss, /backdrop-filter:blur\(5px\) saturate\(115%\)/);
});

test("visual emphasis is versioned as the final cinematic presentation layer", () => {
  const legibility = entryCss.search(/act-showcase-theme-legibility\.css\?v=[A-Za-z0-9._-]+/);
  const scene = entryCss.search(/act-showcase-theme-scene-contract\.css\?v=[A-Za-z0-9._-]+/);
  const emphasis = entryCss.search(/act-showcase-visual-emphasis\.css\?v=[A-Za-z0-9._-]+/);
  assert.ok(legibility >= 0 && scene > legibility && emphasis > scene);
  assert.match(entryCss.trim().split("\n").at(-1), /act-showcase-visual-emphasis\.css\?v=[A-Za-z0-9._-]+/);
  assert.match(cinematicHtml, /act-showcase-entry\.css\?v=[A-Za-z0-9._-]+/);
});
