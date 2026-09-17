import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("ACT TRAILER follow scrolling reacts to typed content as well as resize changes", async () => {
  const layout = await read("js/act-showcase-cinematic-layout-v2.js");
  assert.match(layout, /const supportsResizeObserver = typeof ResizeObserver === "function"/);
  assert.match(layout, /record\.type === "characterData"[\s\S]*scheduleTrailerFrame\(trailerReadout\)/);
  assert.match(layout, /new ResizeObserver\(\(\) => scheduleTrailerFrame\(readout\)\)/);
  assert.match(layout, /window\.addEventListener\("resize"[\s\S]*scheduleTrailerFrame\(readout\)/);
});

test("ACT TRAILER batches page-follow work into animation frames", async () => {
  const layout = await read("js/act-showcase-cinematic-layout-v2.js");
  assert.match(layout, /let trailerFrame = 0/);
  assert.match(layout, /cancelAnimationFrame\(trailerFrame\)/);
  assert.match(layout, /trailerFrame = requestAnimationFrame\(\(\) => updateTrailerFrame\(readout\)\)/);
});

test("ACT TRAILER follows the expanding field with document scrolling instead of readout scrolling", async () => {
  const layout = await read("js/act-showcase-cinematic-layout-v2.js");
  assert.match(layout, /const trailerPageTargets = new WeakMap\(\)/);
  assert.match(layout, /document\.body\.classList\.toggle\("showcase-trailer-document-scroll", active\)/);
  assert.match(layout, /const readoutBottom = readout\.getBoundingClientRect\(\)\.bottom \+ window\.scrollY/);
  assert.match(layout, /const previousTarget = trailerPageTargets\.get\(readout\)/);
  assert.match(layout, /Math\.abs\(targetTop - previousTarget\) <= 1/);
  assert.match(layout, /window\.scrollTo\(\{/);
  assert.doesNotMatch(layout, /readout\.scrollTo\(\{/);
  assert.doesNotMatch(layout, /stage\.scrollTo\(\{/);
});

test("ACT TRAILER visual layer releases all nested height and overflow caps while page scrolling is active", async () => {
  const emphasis = await read("css-next/pages/act-showcase-visual-emphasis.css");
  assert.match(emphasis, /showcase-trailer-document-scroll[\s\S]*\.cinematic-intro\.neotokyo-sequence\{[\s\S]*position:relative[\s\S]*height:auto[\s\S]*overflow:visible/);
  assert.match(emphasis, /showcase-trailer-document-scroll[\s\S]*\.neotokyo-sequence__shell\{[\s\S]*height:auto[\s\S]*overflow:visible/);
  assert.match(emphasis, /showcase-trailer-document-scroll[\s\S]*\.neotokyo-sequence__stage\.is-trailer-scroll\{[\s\S]*overflow:visible/);
  assert.match(emphasis, /showcase-trailer-document-scroll[\s\S]*\.neotokyo-sequence__screen--trailer\{[\s\S]*max-height:none[\s\S]*overflow:visible/);
  assert.match(emphasis, /showcase-trailer-document-scroll[\s\S]*\.neotokyo-sequence__trailer-terminal\{[\s\S]*max-height:none[\s\S]*overflow:visible/);
  assert.match(emphasis, /showcase-trailer-document-scroll[\s\S]*\.neotokyo-sequence__readout\.is-terminal-readout\{[\s\S]*max-height:none[\s\S]*overflow:visible/);
  assert.match(emphasis, /\.neotokyo-sequence__stage\.is-trailer-scroll:before\{[\s\S]*inset:clamp/);
});

test("ACT TRAILER uses one cache-busted layout owner and no legacy live-frame module", async () => {
  const bootstrap = await read("js/act-showcase-bootstrap.js");
  assert.match(bootstrap, /act-showcase-cinematic-layout-v2\.js\?v=[A-Za-z0-9._-]+/);
  assert.doesNotMatch(bootstrap, /act-showcase-trailer-live-frame\.js/);
});
