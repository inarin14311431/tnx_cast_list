import { actShowcaseCssEntry, actShowcaseCss } from "./helpers/act-showcase-css.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

test("final visual/trailer fix loads after presentation tuning through the page entries", async () => {
  const [entry, bootstrap] = await Promise.all([
    actShowcaseCssEntry(),
    read("js/act-showcase-bootstrap.js")
  ]);
  const tuning = entry.indexOf("act-showcase-presentation-tuning.css");
  const fix = entry.indexOf("act-showcase-visual-trailer-fix.css");
  assert.ok(tuning >= 0 && fix > tuning);
  assert.doesNotMatch(bootstrap, /act-showcase-visual-caption-code/);
});

test("trailer frame grows to full text and stage owns overflow", async () => {
  const css = await actShowcaseCss("act-showcase-visual-trailer-fix");
  assert.match(css, /stage:has\(> \.neotokyo-sequence__screen--trailer\.is-visible\)/);
  assert.match(css, /overflow-y:auto/);
  // The readout's max-height/overflow in this file were fully shadowed by act-showcase-cinematic-v2.css
  // (same selector, loaded later) and were removed; the effective rule lives there.
  const effective = await actShowcaseCss("act-showcase-cinematic-v2");
  assert.match(effective, /screen--trailer \.neotokyo-sequence__readout\{[\s\S]*max-height:none;[\s\S]*overflow:visible/);
  assert.doesNotMatch(css, /max-height:calc\(100svh/);
  assert.doesNotMatch(effective, /max-height:calc\(100svh/);
});

test("visual caption replaces duplicated cast content with archive metadata and deterministic code", async () => {
  const [rules, page] = await Promise.all([read("js/act-showcase-visual-caption.js"), read("js/act-showcase-page.js")]);
  assert.match(rules, /VISUAL TRACE \/\/ NX-/);
  assert.match(rules, /NODE:PUBLIC/);
  assert.match(page, /poster-v2-visual__meta/);
  assert.match(page, /poster-v2-visual__code/);
  // The caption is built once in its final form; no observer rewrites it afterwards.
  assert.doesNotMatch(rules, /MutationObserver/);
  assert.match(page, /buildVisualCaption\(cast, name\)/);
});
