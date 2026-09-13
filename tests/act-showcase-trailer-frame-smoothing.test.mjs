import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("ACT TRAILER frame follows real size changes instead of every typed character", async () => {
  const frame = await read("js/act-showcase-trailer-live-frame.js");
  assert.match(frame, /const supportsResizeObserver = typeof ResizeObserver === "function"/);
  assert.match(frame, /characterData: !supportsResizeObserver/);
  assert.match(frame, /new ResizeObserver\(\(\) => scheduleFrame\(readout\)\)/);
  assert.match(frame, /const lastHeights = new WeakMap\(\)/);
  assert.match(frame, /if \(lastHeights\.get\(terminal\) === targetHeight\) return/);
});

test("ACT TRAILER growth uses one eased height transition and skips duplicate writes", async () => {
  const frame = await read("js/act-showcase-trailer-live-frame.js");
  assert.match(frame, /height \.16s cubic-bezier\(\.22,\.61,\.36,1\)/);
  assert.match(frame, /pendingReadouts = new Set\(\)/);
  assert.match(frame, /requestAnimationFrame\(\(\) => \{/);
});

test("ACT TRAILER follow scroll does not restart for the same target while typing", async () => {
  const layout = await read("js/act-showcase-cinematic-layout-v2.js");
  assert.match(layout, /const trailerScrollTargets = new WeakMap\(\)/);
  assert.match(layout, /Math\.abs\(targetTop - previousTarget\) <= 1/);
  assert.match(layout, /trailerScrollTargets\.set\(stage, targetTop\)/);
  assert.match(layout, /if \(!supportsResizeObserver\) scheduleTrailerFrame\(recordTarget\)/);
});

test("ACT TRAILER smoothing modules are cache-busted together", async () => {
  const bootstrap = await read("js/act-showcase-bootstrap.js");
  assert.match(bootstrap, /act-showcase-cinematic-layout-v2\.js\?v=8/);
  assert.match(bootstrap, /act-showcase-trailer-live-frame\.js\?v=2/);
});
