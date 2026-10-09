import { test, expect } from "@playwright/test";
import { ACT_SLUG, ACT_THEMES, installActShowcaseRoutes, showcaseData } from "./fixtures/act-showcase-data.js";

// ASSIGN scene: the three assigned styles are cards that turn face-up left to right, then "CAST ASSIGNED" shows.
const withStyles = labels => ({
  ...showcaseData,
  casts: showcaseData.casts.map(cast => ({ ...cast, styles: labels.map((label, index) => ({ label, handoutRole: index === 0 })) }))
});
const LONG_NAMES = withStyles(["カゲムシャ◎●", "エグゼク●", "クロマク◎"]);
const EIGHT_CHARS = withStyles(["ブラックハウンド◎", "ミストレス●", "トーキー◎●"]);

// Opens the act and clicks ASSIGN // PC1. `record` installs a frame-by-frame log of when each card turned.
async function startAssign(page, { data = showcaseData, theme = "nova", record = false, flip = "" } = {}) {
  await installActShowcaseRoutes(page, data);
  await page.goto(`/act-showcase.html?id=${ACT_SLUG}&theme=${theme}${flip ? `&flip=${flip}` : ""}`);
  const advance = page.locator(".neotokyo-sequence__advance");
  for (let step = 0; step < 6; step += 1) {
    await expect(advance).toBeVisible({ timeout: 20_000 });
    const label = ((await advance.textContent()) || "").trim();
    if (label === "ASSIGN // PC1") break;
    await advance.click({ force: true });
    await expect(advance).not.toHaveText(label, { timeout: 15_000 });
  }
  await expect(advance).toHaveText("ASSIGN // PC1");
  if (record) {
    await page.evaluate(() => {
      const log = { assigned: null, turned: [], settled: [], rows: [], overflow: [], tops: [], done: null, advance: null, pendingHidden: null, faceDownVisibility: null };
      window.__assignLog = log;
      const tick = now => {
        const sequence = document.querySelector(".neotokyo-sequence__screen--linked");
        const cards = [...document.querySelectorAll(".neotokyo-sequence__cast--linked .neotokyo-style-card")];
        const assigned = document.querySelector(".neotokyo-sequence__cast--linked .neotokyo-sequence__assigned");
        if (sequence?.classList.contains("is-assigned") && cards.length && log.assigned === null) {
          log.assigned = now;
          log.faceDownVisibility = cards.map(card => getComputedStyle(card.querySelector(".neotokyo-style-card__front")).visibility);
          log.pendingHidden = getComputedStyle(assigned).visibility === "hidden";
        }
        cards.forEach((card, index) => {
          // a card has turned once it is past the half-way point (the face is toward the viewer: matrix a >= 0)
          const matrix = new DOMMatrixReadOnly(getComputedStyle(card.querySelector(".neotokyo-style-card__inner")).transform);
          if (matrix.a >= 0 && log.turned[index] === undefined) log.turned[index] = now;
          if (matrix.a >= 0.999 && log.settled[index] === undefined) log.settled[index] = now;
        });
        if (assigned && cards.length && log.turned.filter(Boolean).length === cards.length && log.done === null
          && getComputedStyle(assigned).visibility !== "hidden") log.done = now;
        if (log.assigned !== null && cards.length && log.advance === null) {
          log.rows.push(cards[0].offsetHeight); // layout height: the cast card's own entrance scale is not part of it
          log.overflow.push(sequence.scrollWidth - sequence.clientWidth);
          log.tops.push(sequence.scrollTop);
        }
        const next = document.querySelector(".neotokyo-sequence__advance");
        if (log.assigned !== null && next && !next.hidden && /NEXT/.test(next.textContent) && log.advance === null) log.advance = now;
        if (log.advance === null) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }
  await advance.click({ force: true });
}

// ?flip=fast|normal|slow picks the turn length and the gap between cards (anything else, or nothing, is normal).
// The scene holds for the whole reveal plus 300ms; the first row is the default.
const FLIPS = [
  { flip: "", name: "指定なし(normal)", turn: 600, gap: 300 },
  { flip: "normal", name: "normal", turn: 600, gap: 300 },
  { flip: "fast", name: "fast", turn: 320, gap: 100 },
  { flip: "slow", name: "slow", turn: 900, gap: 450 },
  { flip: "bogus", name: "不正な値(normal)", turn: 600, gap: 300 }
];
for (const { flip, name, turn, gap } of FLIPS) {
  test(`ASSIGN: 3枚が左から順に表になり、3枚が終わってから CAST ASSIGNED が出る (flip=${name})`, async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await startAssign(page, { record: true, flip });
    const advance = page.locator(".neotokyo-sequence__advance");
    await expect(advance).toHaveText("NEXT // HANDOUT 02", { timeout: 20_000 });
    await expect.poll(() => page.evaluate(() => window.__assignLog.advance !== null)).toBe(true);
    const log = await page.evaluate(() => window.__assignLog);

    expect(log.turned.filter(Boolean)).toHaveLength(3);
    expect(log.turned[0]).toBeLessThan(log.turned[1]);
    expect(log.turned[1]).toBeLessThan(log.turned[2]);
    const tolerance = Math.max(45, gap * 0.25); // frame quantisation of the edge-on detection
    for (const [from, to] of [[0, 1], [1, 2]]) {
      expect(log.turned[to] - log.turned[from], `gap ${from}->${to}`).toBeGreaterThan(gap - tolerance);
      expect(log.turned[to] - log.turned[from], `gap ${from}->${to}`).toBeLessThan(gap + tolerance);
    }
    // before turning, the face (style name) is hidden and CAST ASSIGNED has not appeared
    expect(log.faceDownVisibility).toEqual(["hidden", "hidden", "hidden"]);
    expect(log.pendingHidden).toBe(true);
    expect(log.done).toBeGreaterThanOrEqual(log.turned[2]);
    // the last card settles, then CAST ASSIGNED shows, then the scene rests ~300ms before NEXT
    expect(log.settled.filter(Boolean)).toHaveLength(3);
    expect(log.settled[2]).toBeLessThanOrEqual(log.advance);
    expect(log.done - log.turned[2], "badge waits for the last turn to finish").toBeGreaterThanOrEqual(turn * 0.25); // the edge-on frame and the badge are both sampled per frame, so keep a margin
    const hold = 2 * gap + turn + 300;
    const duration = log.advance - log.assigned;
    testInfo.annotations.push({ type: "assign-scene-duration-ms", description: `${name}: ${Math.round(duration)} (hold ${hold})` });
    expect(duration - hold).toBeLessThanOrEqual(250);
    expect(duration - hold).toBeGreaterThanOrEqual(-60);

    const cards = page.locator(".neotokyo-sequence__cast--linked .neotokyo-style-card");
    await expect(cards).toHaveCount(3);
    for (let index = 0; index < 3; index += 1) {
      await expect(cards.nth(index)).toHaveClass(/is-flipped/);
      await expect(cards.nth(index).locator(".neotokyo-style-card__front")).toBeVisible();
    }
    await expect(page.locator(".neotokyo-sequence__cast--linked .neotokyo-sequence__assigned")).toBeVisible();
    // the timing reaches the CSS through the row's variables (one source in the script)
    const vars = await page.locator(".neotokyo-sequence__cast--linked .neotokyo-sequence__style-cards").evaluate(row => ({
      turn: row.style.getPropertyValue("--flip-turn"),
      gap: row.style.getPropertyValue("--flip-gap"),
      duration: getComputedStyle(row.querySelector(".neotokyo-style-card__inner")).transitionDuration
    }));
    expect(vars.turn).toBe(`${turn}ms`);
    expect(vars.gap).toBe(`${gap}ms`);
  });
}

test("ASSIGN: カードの表は今のラベル文字列のまま(印は付いているものだけ、裏面と薄い印は読み上げない)", async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await startAssign(page);
  const advance = page.locator(".neotokyo-sequence__advance");
  await expect(advance).toHaveText("NEXT // HANDOUT 02", { timeout: 15_000 });
  const row = page.locator(".neotokyo-sequence__cast--linked .neotokyo-sequence__styles");
  await expect(row).toHaveText("カブキ◎カゼ●ニューロ");
  const hidden = await row.evaluate(element => ({
    backs: [...element.querySelectorAll(".neotokyo-style-card__back")].every(back => back.getAttribute("aria-hidden") === "true"),
    unlitCount: element.querySelectorAll(".neotokyo-style-card__mark:not(.is-lit)").length,
    litCount: element.querySelectorAll(".neotokyo-style-card__mark.is-lit").length,
    spans: element.querySelectorAll("span").length
  }));
  expect(hidden).toEqual({ backs: true, unlitCount: 0, litCount: 2, spans: 0 });
  // the style that matches the participation slot is emphasised
  await expect(page.locator(".neotokyo-sequence__cast--linked .neotokyo-style-card.is-role")).toHaveCount(1);
  await expect(page.locator(".neotokyo-sequence__cast--linked .neotokyo-style-card.is-role .neotokyo-style-card__name")).toHaveText("カブキ");
});

test("ASSIGN: SKIP で即座に全カードが表になる", async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await startAssign(page);
  // Click SKIP in the same frame the cards first appear (they are still face down), then read the result synchronously.
  const result = await page.evaluate(() => new Promise((resolve, reject) => {
    const deadline = performance.now() + 15_000;
    const tick = () => {
      const cards = [...document.querySelectorAll(".neotokyo-style-card")];
      if (cards.length) {
        const faceUp = () => cards.filter(card => getComputedStyle(card.querySelector(".neotokyo-style-card__front")).visibility === "visible").length;
        const before = faceUp();
        document.querySelector(".neotokyo-sequence__skip").click();
        resolve({ before, after: cards.map(card => card.classList.contains("is-flipped")), faceUp: faceUp() });
      } else if (performance.now() > deadline) reject(new Error("style cards never appeared"));
      else requestAnimationFrame(tick);
    };
    tick();
  }));
  expect(result.before).toBeLessThan(3);
  expect(result.after).toEqual([true, true, true]);
  expect(result.faceUp).toBe(3);
});

test("ASSIGN: reduced-motion では最初から表(めくらない)", async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await startAssign(page);
  const cards = page.locator(".neotokyo-sequence__cast--linked .neotokyo-style-card");
  await expect(cards).toHaveCount(3, { timeout: 15_000 });
  const first = await page.evaluate(() => [...document.querySelectorAll(".neotokyo-style-card")].map(card => ({
    flipped: card.classList.contains("is-flipped"),
    face: getComputedStyle(card.querySelector(".neotokyo-style-card__front")).visibility,
    turn: getComputedStyle(card.querySelector(".neotokyo-style-card__inner")).transitionDuration
  })));
  expect(first).toEqual(Array(3).fill({ flipped: true, face: "visible", turn: "0s" }));
  await expect(page.locator(".neotokyo-sequence__cast--linked .neotokyo-sequence__assigned")).toBeVisible();
});

for (const [width, height] of [[1440, 1000], [1024, 768], [444, 900], [390, 844]]) {
  for (const [name, data] of [["標準", showcaseData], ["長いスタイル名", LONG_NAMES], ["8文字", EIGHT_CHARS]]) {
    test(`ASSIGN: 3枚が枠からはみ出さず、スタイル名が1行 (${name}, ${width}px)`, async ({ page }) => {
      test.setTimeout(60_000);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.setViewportSize({ width, height });
      await startAssign(page, { data, theme: ACT_THEMES[width % ACT_THEMES.length] });
      await expect(page.locator(".neotokyo-style-card")).toHaveCount(3, { timeout: 15_000 });
      await expect(page.locator(".neotokyo-sequence__advance")).toHaveText("NEXT // HANDOUT 02", { timeout: 15_000 });
      const fit = await page.evaluate(() => {
        const frame = document.querySelector(".neotokyo-sequence__cast--linked").getBoundingClientRect();
        const panel = document.querySelector(".neotokyo-sequence__assign-panel").getBoundingClientRect();
        const rows = [...document.querySelectorAll(".neotokyo-style-card")].map(card => {
          const box = card.getBoundingClientRect();
          const name = card.querySelector(".neotokyo-style-card__name");
          const nameBox = name.getBoundingClientRect();
          const face = card.querySelector(".neotokyo-style-card__front").getBoundingClientRect();
          const lineHeight = parseFloat(getComputedStyle(name).lineHeight);
          return {
            inFrame: box.left >= frame.left - 0.5 && box.right <= frame.right + 0.5 && box.right <= panel.right + 0.5,
            inViewport: box.left >= 0 && box.right <= innerWidth,
            oneLine: nameBox.height <= lineHeight * 1.2 && name.scrollWidth <= name.clientWidth + 1,
            nameInFace: nameBox.left >= face.left - 0.5 && nameBox.right <= face.right + 0.5,
            labelInFace: [...card.querySelectorAll(".neotokyo-style-card__name, .neotokyo-style-card__mark")].every(item => {
              const r = item.getBoundingClientRect();
              return r.left >= face.left - 0.5 && r.right <= face.right + 0.5 && r.top >= face.top - 0.5 && r.bottom <= face.bottom + 0.5;
            }),
            marksBesideName: [...card.querySelectorAll(".neotokyo-style-card__mark")].every(item => {
              const r = item.getBoundingClientRect();
              return r.left >= nameBox.right - 1 && r.top >= nameBox.top - 2 && r.bottom <= nameBox.bottom + 2;
            }),
            markRatio: (() => {
              const mark = card.querySelector(".neotokyo-style-card__mark");
              return mark ? parseFloat(getComputedStyle(mark).fontSize) / parseFloat(getComputedStyle(name).fontSize) : 0.8;
            })(),
            fontPx: parseFloat(getComputedStyle(name).fontSize)
          };
        });
        return { rows, scrollOverflow: document.documentElement.scrollWidth > innerWidth };
      });
      for (const row of fit.rows) {
        expect(row.inFrame).toBe(true);
        expect(row.inViewport).toBe(true);
        expect(row.oneLine).toBe(true);
        expect(row.nameInFace).toBe(true);
        expect(row.labelInFace, "name and marks stay inside the face").toBe(true);
        expect(row.marksBesideName, "marks sit beside the name on the same line").toBe(true);
        expect(row.markRatio, "marks are 0.8 of the name size").toBeGreaterThan(0.75);
        expect(row.markRatio).toBeLessThan(0.85);
        // the label (name + marks on one line) shrinks to fit: 8-character names and 5 characters with two marks may go down to the floor (7px)
        expect(row.fontPx).toBeGreaterThanOrEqual(width >= 1024 || data === showcaseData ? 10 : 7);
      }
      expect(fit.scrollOverflow).toBe(false);
    });
  }
}


test("ASSIGN: body.showcase-neotokyo-reduced だけでも最初から表(めくらない)", async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => document.addEventListener("DOMContentLoaded", () => document.body.classList.add("showcase-neotokyo-reduced")));
  await startAssign(page);
  const cards = page.locator(".neotokyo-sequence__cast--linked .neotokyo-style-card");
  await expect(cards).toHaveCount(3, { timeout: 15_000 });
  const first = await page.evaluate(() => [...document.querySelectorAll(".neotokyo-style-card")].map(card => ({
    flipped: card.classList.contains("is-flipped"),
    face: getComputedStyle(card.querySelector(".neotokyo-style-card__front")).visibility,
    turn: getComputedStyle(card.querySelector(".neotokyo-style-card__inner")).transitionDuration
  })));
  expect(first).toEqual(Array(3).fill({ flipped: true, face: "visible", turn: "0s" }));
});

test("ASSIGN: スマホ幅でめくりの最中に自動スクロール(読み上げ連動)が走っても、カードの高さ・横幅が毎フレーム変わらない", async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 390, height: 640 });
  await startAssign(page, { record: true });
  const advance = page.locator(".neotokyo-sequence__advance");
  await expect(advance).toHaveText("NEXT // HANDOUT 02", { timeout: 15_000 });
  const log = await page.evaluate(() => window.__assignLog);
  expect(log.settled.filter(Boolean)).toHaveLength(3);
  // the cards are fixed-size boxes inside the scroll area: turning them never makes the screen scroll sideways
  const geometry = await page.evaluate(() => {
    const screen = document.querySelector(".neotokyo-sequence__screen--linked");
    const row = document.querySelector(".neotokyo-sequence__cast--linked .neotokyo-sequence__style-cards");
    return { overflowX: screen.scrollWidth - screen.clientWidth, page: document.documentElement.scrollWidth - innerWidth, rowHeight: row.getBoundingClientRect().height };
  });
  // every frame from is-assigned to NEXT, including those where the reveal scroll runs
  expect(new Set(log.rows).size).toBe(1);
  expect(Math.max(...log.overflow)).toBeLessThanOrEqual(1);
  expect(log.tops.length).toBeGreaterThan(10);
  expect(geometry.overflowX).toBeLessThanOrEqual(1);
  expect(geometry.page).toBeLessThanOrEqual(0);
});

test("ASSIGN: ?flip=slow でも reduced-motion は最初から表(めくらない)で、待ちも従来どおり", async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await startAssign(page, { flip: "slow" });
  const cards = page.locator(".neotokyo-sequence__cast--linked .neotokyo-style-card");
  await expect(cards).toHaveCount(3, { timeout: 15_000 });
  const first = await page.evaluate(() => [...document.querySelectorAll(".neotokyo-style-card")].map(card => ({
    flipped: card.classList.contains("is-flipped"),
    face: getComputedStyle(card.querySelector(".neotokyo-style-card__front")).visibility,
    turn: getComputedStyle(card.querySelector(".neotokyo-style-card__inner")).transitionDuration
  })));
  expect(first).toEqual(Array(3).fill({ flipped: true, face: "visible", turn: "0s" }));
  await expect(page.locator(".neotokyo-sequence__advance")).toHaveText("NEXT // HANDOUT 02", { timeout: 15_000 });
});

test("ASSIGN: ?flip=slow で SKIP すると、めくりの途中でも即座に全カードが表になる", async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await startAssign(page, { flip: "slow" });
  const result = await page.evaluate(() => new Promise((resolve, reject) => {
    const deadline = performance.now() + 15_000;
    const tick = () => {
      const cards = [...document.querySelectorAll(".neotokyo-style-card")];
      if (cards.length) {
        const faceUp = () => cards.filter(card => getComputedStyle(card.querySelector(".neotokyo-style-card__front")).visibility === "visible").length;
        const before = faceUp();
        document.querySelector(".neotokyo-sequence__skip").click();
        resolve({ before, faceUp: faceUp(), badge: getComputedStyle(document.querySelector(".neotokyo-sequence__cast--linked .neotokyo-sequence__assigned") || document.body).visibility });
      } else if (performance.now() > deadline) reject(new Error("style cards never appeared"));
      else requestAnimationFrame(tick);
    };
    tick();
  }));
  expect(result.before).toBeLessThan(3);
  expect(result.faceUp).toBe(3);
  expect(result.badge).not.toBe("hidden");
});
