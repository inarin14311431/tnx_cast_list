import { test, expect } from "@playwright/test";
import { ACT_SLUG, installActShowcaseRoutes, showcaseData } from "./fixtures/act-showcase-data.js";

// The ACT TRAILER readout types its text. The frame around it has to grow smoothly (no one-line steps), the text
// that is already shown must not move (no line re-wrapping), and the caret's line has to stay on screen, also for a
// text taller than the screen. Everything is measured every animation frame while the text is typed.
const PARAGRAPH = "夜のN◎VAに未明の警報が響く。消えたデータの痕跡を追い、三人のキャストが動き出す。依頼人は沈黙を守り、市政調査局は動かない。残された手掛かりは、境界線から届いた断片的なニュースと、鋼鉄の番犬が持ち帰った一枚の記録媒体だけだった。";
// Normal-speed short text: two paragraphs with a single line break (a blank line is a two-line jump; where the frame
// has to keep the reading line visible it may step more than half a line, which the long-text cases cover).
const SHORT_BODY = `${PARAGRAPH}\n${PARAGRAPH}`;
// 12 paragraphs: with the CI fonts the text is ~950px (phone) / ~1250px (PC) tall, above the 844 / 1000 screens; fewer left it below the PC/phone screen
const LONG_BODY = Array.from({ length: 12 }, (_, index) => `${index + 1}. ${PARAGRAPH}`).join("\n\n");

async function typeTrailerAndSample(page, body, { reducedMotion = false } = {}) {
  if (reducedMotion) await page.emulateMedia({ reducedMotion: "reduce" });
  await installActShowcaseRoutes(page, { ...showcaseData, trailer: { title: "夜明け前の通信", body } });
  // The sampler runs from before the trailer exists: one record per animation frame while data-typing is set.
  await page.addInitScript(() => {
    const samples = [];
    window.__trailerSamples = samples;
    const watched = new Map();
    window.__trailerWatched = watched;
    // Measured inside the animation frame, right after the frame loop of js/act-showcase-cinematic-layout-v2.js has
    // run (this sampler starts its own loop only after the trailer exists, so its callback is registered later and
    // runs later in every frame). That is the state that is painted: typing timers run before the animation-frame
    // callbacks, never between them and the paint, so a measurement taken in a later task would see characters that
    // were typed after the frame was drawn.
    const measure = () => {
      const readout = document.querySelector(".neotokyo-sequence__readout--split");
      if (readout && readout.dataset.typing === "true") {
        const terminal = readout.closest(".neotokyo-sequence__trailer-terminal");
        const read = readout.querySelector(".neotokyo-sequence__readout-read");
        const text = read?.firstChild;
        const length = text?.length || 0;
        const style = getComputedStyle(readout);
        const lineHeight = parseFloat(style.lineHeight);
        let caretTop = null;
        let caretBottom = null;
        if (length > 0) {
          const range = document.createRange();
          range.setStart(text, length - 1);
          range.setEnd(text, length);
          const rect = [...range.getClientRects()].filter(item => item.height > 0).at(-1);
          if (rect) { caretTop = rect.top; caretBottom = rect.bottom; }
        }
        // where each 25th character is (its line within the readout and its share of the readout's width), the first
        // time it is shown and in every later frame. The screen's entrance animation moves everything together, so
        // positions are taken relative to the readout and only after that animation (the first 700ms).
        const moved = [];
        const readoutRect = readout.getBoundingClientRect();
        window.__trailerStart ??= performance.now();
        const settled = performance.now() - window.__trailerStart > 700;
        for (let index = 0; index < length; index += 25) {
          const range = document.createRange();
          range.setStart(text, index);
          range.setEnd(text, index + 1);
          const rect = [...range.getClientRects()].filter(item => item.height > 0)[0];
          if (!rect) continue;
          const position = [(rect.top - readoutRect.top) / lineHeight, (rect.left - readoutRect.left) / readoutRect.width];
          const before = watched.get(index);
          if (!settled) continue;
          if (!before) watched.set(index, position);
          else if (Math.abs(before[0] - position[0]) > 0.3 || Math.abs(before[1] - position[1]) > 0.006) moved.push({ index, before, position });
        }
        samples.push({
          height: terminal ? terminal.getBoundingClientRect().height : null,
          frameBottom: terminal ? terminal.getBoundingClientRect().bottom : null,
          inlineHeight: terminal?.style.height || "",
          type: { pattern: readout.closest(".neotokyo-sequence__screen--trailer")?.dataset.trailerPattern || "", fontSize: style.fontSize, lineHeight: style.lineHeight, padding: style.padding },
          lineHeight, length, caretTop, caretBottom, viewport: innerHeight, scrollY: Math.round(scrollY), moved
        });
      }
    };
    const frame = () => {
      measure();
      requestAnimationFrame(frame);
    };
    new MutationObserver((records, observer) => {
      if (!document.querySelector(".neotokyo-sequence__readout--split")) return;
      observer.disconnect();
      setTimeout(() => requestAnimationFrame(frame), 0);
    }).observe(document, { subtree: true, childList: true });
  });
  await page.goto(`/act-showcase.html?id=${ACT_SLUG}&theme=nova`);
  const advance = page.locator(".neotokyo-sequence__advance");
  for (let step = 0; step < 6; step += 1) {
    await expect(advance).toBeVisible({ timeout: 30_000 });
    const label = ((await advance.textContent()) || "").trim();
    await advance.click({ force: true });
    if (label === "NEXT // ACT TRAILER") break;
    await page.waitForTimeout(500);
  }
  await expect(page.locator(".neotokyo-sequence__screen--trailer")).toBeVisible();
  await expect(page.locator(".neotokyo-sequence__readout--split")).not.toHaveAttribute("data-typing", "true", { timeout: 60_000 });
  const samples = await page.evaluate(() => window.__trailerSamples);
  // the frame's height once the reading has ended (the frame is released to its natural height)
  const finalHeight = await page.locator(".neotokyo-sequence__trailer-terminal").evaluate(element => element.getBoundingClientRect().height);
  // the type and the position of every watched character once the reading has ended, to compare with while typing
  const after = await page.evaluate(() => {
    const readout = document.querySelector(".neotokyo-sequence__readout--split");
    const style = getComputedStyle(readout);
    const text = readout.querySelector(".neotokyo-sequence__readout-read").firstChild;
    const box = readout.getBoundingClientRect();
    const lineHeight = parseFloat(style.lineHeight);
    const moved = [];
    for (const [index, before] of window.__trailerWatched) {
      const range = document.createRange();
      range.setStart(text, index);
      range.setEnd(text, index + 1);
      const rect = [...range.getClientRects()].filter(item => item.height > 0)[0];
      if (!rect) continue;
      const position = [(rect.top - box.top) / lineHeight, (rect.left - box.left) / box.width];
      if (Math.abs(before[0] - position[0]) > 0.3 || Math.abs(before[1] - position[1]) > 0.006) moved.push({ index, before, position });
    }
    return {
      type: { pattern: readout.closest(".neotokyo-sequence__screen--trailer")?.dataset.trailerPattern || "", fontSize: style.fontSize, lineHeight: style.lineHeight, padding: style.padding },
      moved
    };
  });
  return Object.assign(samples, { finalHeight, after });
}

// The caret line's bottom may hang at most one line below the frame's bottom edge: the frame never falls so far behind
// that the line being read is hidden under it.
function worstHang(samples) {
  let worst = -Infinity;
  for (const sample of samples) {
    if (sample.caretBottom === null || sample.frameBottom === null) continue;
    worst = Math.max(worst, sample.caretBottom - sample.frameBottom);
  }
  return worst;
}

function summarize(samples) {
  const heights = samples.map(sample => sample.height);
  const lineHeight = samples[0].lineHeight;
  let maxStep = 0;
  for (let index = 1; index < heights.length; index += 1) maxStep = Math.max(maxStep, Math.abs(heights[index] - heights[index - 1]));
  return { frames: samples.length, lineHeight, maxStep, first: heights[0], last: heights.at(-1) };
}

for (const [label, size] of [["PC 1440x1000", { width: 1440, height: 1000 }], ["スマホ 390x844", { width: 390, height: 844 }]]) {
  test(`ACT TRAILER 読み上げ(${label}): 枠は階段状でなく滑らかに伸び、既読の文字は動かない`, async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    await page.setViewportSize(size);
    const samples = await typeTrailerAndSample(page, SHORT_BODY);
    const summary = summarize(samples);
    console.log(`TRAILER ${label} ${JSON.stringify(summary)}`);
    if (process.env.TRAILER_DEBUG) samples.forEach((sample, index) => { const step = index ? sample.height - samples[index - 1].height : 0; if (Math.abs(step) > summary.lineHeight / 2) console.log("ROW " + JSON.stringify({ index, step: Math.round(step * 10) / 10, height: Math.round(sample.height), hang: Math.round(sample.caretBottom - sample.frameBottom), length: sample.length, prevLength: samples[index - 1].length })); });
    await testInfo.attach("trailer-frame-summary.json", { body: JSON.stringify(summary, null, 2), contentType: "application/json" });
    expect(samples.length, "typing is sampled over many frames").toBeGreaterThan(20);
    // the frame really grows during the reading
    expect(summary.last - summary.first, JSON.stringify(summary)).toBeGreaterThan(summary.lineHeight * 1.5);
    // no step: the visible height changes by at most half a line between two frames
    expect(summary.maxStep, JSON.stringify(summary)).toBeLessThanOrEqual(summary.lineHeight / 2);
    // text that is already shown never moves (no re-wrapping while reading)
    const moved = samples.flatMap(sample => sample.moved);
    expect(moved.slice(0, 3), "shown characters keep their place").toEqual([]);
  });
}

// A text taller than the screen, typed fast: on a phone the lines are short, so the typing outruns the frame.
for (const [label, size] of [["PC 1440x1000", { width: 1440, height: 1000 }], ["スマホ 390x844", { width: 390, height: 844 }]]) {
  test(`ACT TRAILER 読み上げ(${label}): 画面の高さを超える長い本文でも、読み上げている行が常に画面内にあり、枠から1行を超えて遅れない`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize(size);
    const samples = await typeTrailerAndSample(page, LONG_BODY);
    const summary = summarize(samples);
    const hang = worstHang(samples);
    console.log(`TRAILER long ${label} ${JSON.stringify({ ...summary, finalHeight: samples.finalHeight, worstHang: hang })}`);
    expect(samples.length, "typing is sampled over several frames").toBeGreaterThan(5);
    // judged on the finished frame, not on the last sample taken while typing (a few frames on a slow machine)
    expect(samples.finalHeight, "the text is taller than the screen").toBeGreaterThan(samples[0].viewport);
    const outside = samples.filter(sample => sample.caretBottom !== null && (sample.caretBottom > sample.viewport || sample.caretTop < 0));
    if (outside.length) console.log("OUTSIDE " + JSON.stringify(outside.slice(0, 20).map(sample => ({ top: sample.caretTop, bottom: sample.caretBottom, height: sample.height, scrollY: sample.scrollY, length: sample.length }))));
    expect(outside.slice(0, 3).map(sample => ({ top: sample.caretTop, bottom: sample.caretBottom, viewport: sample.viewport })), "caret line stays on screen").toEqual([]);
    // every frame: the line being read is not hidden under the frame's bottom edge by more than one line
    expect(hang, `the caret line hung ${hang}px below the frame (one line is ${summary.lineHeight}px)`).toBeLessThanOrEqual(summary.lineHeight + 0.5);
  });
}

test("ACT TRAILER 読み上げ: prefers-reduced-motion では補間せず、行ごとに切り替わる", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const samples = await typeTrailerAndSample(page, SHORT_BODY, { reducedMotion: true });
  const heights = [...new Set(samples.map(sample => Math.round(sample.height * 10) / 10))].sort((a, b) => a - b);
  await testInfo.attach("trailer-reduced-heights.json", { body: JSON.stringify(heights), contentType: "application/json" });
  const lineHeight = samples[0].lineHeight;
  // every height is a whole line more than the previous one: no in-between values
  for (let index = 1; index < heights.length; index += 1) expect(heights[index] - heights[index - 1], JSON.stringify(heights)).toBeGreaterThan(lineHeight * 0.6);
  expect(heights.length, "one value per line (plus the start)").toBeGreaterThanOrEqual(2);
});

test("ACT TRAILER 読み上げ後: 枠は自然な最終の高さに戻り、全文が1回だけ読み上げ対象になる", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await typeTrailerAndSample(page, SHORT_BODY);
  const readout = page.locator(".neotokyo-sequence__readout--split");
  await expect(readout.locator(".neotokyo-sequence__readout-read")).toHaveText(SHORT_BODY);
  await expect(readout.locator(".neotokyo-sequence__readout-unread")).toHaveText("");
  await expect(readout.locator(".neotokyo-sequence__readout-unread")).toHaveAttribute("aria-hidden", "true");
  // the frame is released: no inline height / overflow left on it
  await expect(page.locator(".neotokyo-sequence__trailer-terminal")).not.toHaveAttribute("style", /height/);
});

// The writing pattern (font size, line height, padding) is decided from the whole text before the reading starts, so the
// reading does not change the type when it ends: nothing is re-laid out and the frame does not jump.
for (const [label, size] of [["PC 1440x1000", { width: 1440, height: 1000 }], ["スマホ 390x844", { width: 390, height: 844 }]]) {
  for (const [bodyLabel, body] of [["短文", SHORT_BODY], ["長文", LONG_BODY]]) {
    test(`ACT TRAILER 読み上げ(${label}, ${bodyLabel}): 型は読み上げ前から確定し、終了の前後で文字サイズ・行間・余白が変わらない`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.setViewportSize(size);
      const samples = await typeTrailerAndSample(page, body);
      expect(samples.length, "typing is sampled over several frames").toBeGreaterThan(5);
      expect(samples[0].type.pattern, "the pattern is set from the first reading frame").not.toBe("");
      const types = new Set([...samples.map(sample => JSON.stringify(sample.type)), JSON.stringify(samples.after.type)]);
      expect([...types], "same pattern / font-size / line-height / padding at the start, while reading and after").toHaveLength(1);
      // the shown text keeps its place when the reading ends
      expect(samples.after.moved.slice(0, 3), "shown characters keep their place at the end").toEqual([]);
      // the frame is released to its natural height: it differs from the last frame by at most one line
      const last = samples.at(-1);
      expect(Math.abs(samples.finalHeight - last.height), `last ${last.height} -> final ${samples.finalHeight}`).toBeLessThanOrEqual(last.lineHeight + 0.5);
    });
  }
}
