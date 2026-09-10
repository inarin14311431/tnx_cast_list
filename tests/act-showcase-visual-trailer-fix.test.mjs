import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

test("final visual/trailer fix loads after presentation tuning through the page entries", async () => {
  const [entry, bootstrap] = await Promise.all([
    read("css-next/pages/act-showcase-entry.css"),
    read("js/act-showcase-bootstrap.js")
  ]);
  const tuning = entry.indexOf("act-showcase-presentation-tuning.css");
  const fix = entry.indexOf("act-showcase-visual-trailer-fix.css");
  assert.ok(tuning >= 0 && fix > tuning);
  assert.match(bootstrap, /act-showcase-visual-caption-code\.js\?v=[^\"']+/);
});

test("trailer frame grows to full text and stage owns overflow", async () => {
  const css = await read("css-next/pages/act-showcase-visual-trailer-fix.css");
  assert.match(css, /stage:has\(> \.neotokyo-sequence__screen--trailer\.is-visible\)/);
  assert.match(css, /overflow-y:auto/);
  assert.match(css, /screen--trailer \.neotokyo-sequence__readout\{[\s\S]*max-height:none;[\s\S]*overflow:visible/);
  assert.doesNotMatch(css, /max-height:calc\(100svh/);
});

test("visual caption replaces duplicated cast content with archive metadata and deterministic code", async () => {
  const js = await read("js/act-showcase-visual-caption-code.js");
  assert.match(js, /VISUAL TRACE \/\/ NX-/);
  assert.match(js, /NODE:PUBLIC/);
  assert.match(js, /poster-v2-visual__meta/);
  assert.match(js, /poster-v2-visual__code/);
  assert.match(js, /MutationObserver/);
});
