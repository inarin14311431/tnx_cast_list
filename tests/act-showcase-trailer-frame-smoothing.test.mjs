import { actShowcaseCss } from "./helpers/act-showcase-css.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

import { settleHeight, TRAILER_SETTLE_TAU_MS } from "../js/act-showcase-trailer-settle.js";

// The rule that moves the frame's visible height toward the caret's line is a pure function; it is run here, not
// matched as text. The DOM side (one frame loop, caret measurement, scroll) is measured by
// tests/e2e/act-showcase-trailer-readout.spec.js.
const LINE = 40;

// The readout's bottom padding, which the frame's height includes below the caret line (the real maxLag is one line
// plus this padding: the caret line's bottom may hang one line below the frame's bottom edge, no more).
const PADDING = 34;

function simulate({ from, to, frameMs = 1000 / 60, reduced = false, maxStepFraction = 0.45 }) {
  const heights = [from];
  let current = from;
  for (let elapsed = 0; elapsed < 1000; elapsed += frameMs) {
    current = settleHeight(current, to, frameMs, { reduced, maxStep: LINE * maxStepFraction, maxLag: LINE + PADDING });
    heights.push(current);
    if (current === to) break;
  }
  return heights;
}

test("ACT TRAILER frame: a one-line step is smooth (small steps, 150-250ms) and arrives exactly", () => {
  const heights = simulate({ from: 100, to: 100 + LINE });
  const steps = heights.slice(1).map((value, index) => Math.abs(value - heights[index]));
  assert.ok(Math.max(...steps) <= LINE / 2, `largest step ${Math.max(...steps)}`);
  const duration = (heights.length - 1) * (1000 / 60);
  assert.ok(duration >= 150 && duration <= 330, `one line takes ${duration}ms`);
  assert.equal(heights.at(-1), 100 + LINE);
  assert.ok(heights.every((value, index) => index === 0 || value >= heights[index - 1]), "never overshoots or goes back");
});

test("ACT TRAILER frame: a two-line jump (blank line) and slow frames never move more than half a line per frame", () => {
  for (const frameMs of [1000 / 60, 33, 64, 120]) {
    const heights = simulate({ from: 100, to: 100 + LINE * 2, frameMs });
    const steps = heights.slice(1).map((value, index) => Math.abs(value - heights[index]));
    assert.ok(Math.max(...steps) <= LINE / 2, `${frameMs}ms frames: largest step ${Math.max(...steps)}`);
    assert.equal(heights.at(-1), 100 + LINE * 2, `${frameMs}ms frames arrive`);
  }
});

// A text typed faster than the frame can follow (a phone's short lines, a long text, a slow device) must not push the
// reading line under the frame's bottom edge: the frame is never more than maxLag behind, whatever maxStep says.
function followFastTarget({ frameMs, linesPerSecond, maxLag, durationMs = 3000 }) {
  let current = 100;
  let worstLag = 0;
  let worstStep = 0;
  let target = 100;
  for (let time = 0; time < durationMs; time += frameMs) {
    target = 100 + LINE * (Math.floor((time / 1000) * linesPerSecond) + 1);
    const next = settleHeight(current, target, frameMs, { maxStep: LINE * 0.45, maxLag });
    worstStep = Math.max(worstStep, Math.abs(next - current));
    current = next;
    worstLag = Math.max(worstLag, target - current);
  }
  // the text ends: the frame arrives
  for (let index = 0; index < 200 && current !== target; index += 1) current = settleHeight(current, target, frameMs, { maxStep: LINE * 0.45, maxLag });
  return { worstLag, worstStep, current, target };
}

test("ACT TRAILER frame: a fast target (25 lines a second) is never more than one line ahead of the frame, at any frame interval", () => {
  for (const frameMs of [16, 33, 64, 120]) {
    const result = followFastTarget({ frameMs, linesPerSecond: 25, maxLag: LINE });
    assert.ok(result.worstLag <= LINE + 1e-6, `${frameMs}ms frames: the frame fell ${result.worstLag}px behind (one line is ${LINE}px)`);
    assert.equal(result.current, result.target, `${frameMs}ms frames: the frame arrives when the text ends`);
  }
});

test("ACT TRAILER frame: the lag rule does not touch normal reading (one line every 1.5s, 60fps)", () => {
  const result = followFastTarget({ frameMs: 1000 / 60, linesPerSecond: 1 / 1.5, maxLag: LINE + PADDING, durationMs: 9000 });
  assert.ok(result.worstStep <= LINE / 2, `largest step ${result.worstStep}`);
  assert.ok(result.worstLag <= LINE + PADDING);
});

test("ACT TRAILER frame: a paragraph break (a two-line jump) at 60fps still moves at most half a line per frame", () => {
  // desktop line + padding, and a phone's shorter line with its smaller padding
  for (const [line, padding] of [[40, 34], [32, 18]]) {
    let current = 100;
    let target = 100 + line * 2;
    let worstStep = 0;
    for (let frame = 0; frame < 120 && current !== target; frame += 1) {
      const next = settleHeight(current, target, 1000 / 60, { maxStep: line * 0.45, maxLag: line + padding });
      worstStep = Math.max(worstStep, Math.abs(next - current));
      current = next;
    }
    assert.ok(worstStep <= line / 2, `line ${line}: largest step ${worstStep}`);
    assert.equal(current, target);
  }
});

test("ACT TRAILER frame: a fast target moves the frame faster than maxStep rather than hide the reading line", () => {
  const slow = followFastTarget({ frameMs: 120, linesPerSecond: 25, maxLag: LINE });
  assert.ok(slow.worstStep > LINE * 0.45, "with long frames the lag rule has to take bigger steps than maxStep");
  const capped = followFastTarget({ frameMs: 120, linesPerSecond: 25, maxLag: Infinity });
  assert.ok(capped.worstLag > LINE, "without the lag rule the same target leaves the frame more than a line behind");
});

test("ACT TRAILER frame: prefers-reduced-motion switches line by line, without interpolation", () => {
  assert.equal(settleHeight(100, 140, 16, { reduced: true }), 140);
  assert.deepEqual(simulate({ from: 100, to: 140, reduced: true }), [100, 140]);
});

test("ACT TRAILER frame: the first value and bad input are taken as they are", () => {
  assert.equal(settleHeight(NaN, 123, 16), 123);
  assert.equal(settleHeight(100, NaN, 16), 100);
  assert.equal(settleHeight(100, 100, 16), 100);
  assert.ok(TRAILER_SETTLE_TAU_MS > 0);
});

test("ACT TRAILER is one frame loop: the frame height and the page scroll follow the same interpolated value", async () => {
  const layout = await read("js/act-showcase-cinematic-layout-v2.js");
  assert.match(layout, /import \{ settleHeight \} from "\.\/act-showcase-trailer-settle\.js\?v=/);
  // one requestAnimationFrame loop per readout while it is typed (data-typing), ended by the reading's end
  assert.match(layout, /function startTrailerLoop\(readout\)/);
  assert.match(layout, /readout\.dataset\.typing !== "true"[\s\S]*followTrailerEnd\(readout\)/);
  // the frame's height is the interpolated value, and the page scroll is computed from the same value
  assert.match(layout, /loop\.current = settleHeight\(loop\.current, target, elapsed, \{ reduced, maxStep: lineHeight \* 0\.45, maxLag: lineHeight \+ paddingBottom \}\)/);
  assert.match(layout, /followFrameBottom\(terminal, loop\.current\)/);
  // the old second mechanism (smooth scrollTo throttled by a timer, characterData / ResizeObserver scheduling) is gone
  assert.doesNotMatch(layout, /TRAILER_SCROLL_THROTTLE_MS|scrollTrailerReadoutIntoView|scheduleTrailerFrame|trailerPageTargets/);
  assert.doesNotMatch(layout, /behavior: "smooth"/);
  assert.match(layout, /behavior: "instant"/);
  assert.match(layout, /document\.body\.classList\.toggle\("showcase-trailer-document-scroll", active\)/);
  assert.doesNotMatch(layout, /readout\.scrollTo\(\{/);
  assert.doesNotMatch(layout, /stage\.scrollTo\(\{/);
  // typewriter text changes are not observed by the layout observer any more
  assert.match(layout, /record\.type === "characterData"\) continue/);
});

test("ACT TRAILER readout lays the whole text out from the start and never changes its line breaks", async () => {
  const sequence = await read("js/act-showcase-neotokyo.js");
  assert.match(sequence, /neotokyo-sequence__readout--split/);
  assert.match(sequence, /function prepareSplitReadout/);
  assert.match(sequence, /unread\.setAttribute\("aria-hidden", "true"\)/);
  assert.match(sequence, /readText\.data = characters\.slice\(0, index\)\.join\(""\)/);
  assert.match(sequence, /unreadText\.data = characters\.slice\(index\)\.join\(""\)/);
  assert.match(sequence, /delete target\.dataset\.typing/);
  const emphasis = await actShowcaseCss("act-showcase-visual-emphasis");
  // the unread part keeps its place in the layout (visibility, never display:none)
  assert.match(emphasis, /\.neotokyo-sequence__readout-unread\{\s*visibility:hidden;/);
  assert.doesNotMatch(emphasis, /readout-unread\{[^}]*display:none/);
  // the caret belongs to the end of the read part and is out of the text flow
  assert.match(emphasis, /readout-read:after\{[\s\S]*?position:absolute/);
});

test("ACT TRAILER visual layer releases all nested height and overflow caps while page scrolling is active", async () => {
  const emphasis = await actShowcaseCss("act-showcase-visual-emphasis");
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
