import { test, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { ACT_SLUG, ACT_THEMES, installActShowcaseRoutes, installHeldActShowcaseRoutes } from "./fixtures/act-showcase-data.js";
import { DECORATIVE_SELECTORS, formatFailure, measureContrast } from "./fixtures/act-showcase-contrast.js";

// Every scene of the cinematic act showcase (loading, access, title, trailer, handout / assignment for each
// cast, summary, final board with each cast selected) and the standard page, in every theme: the text colour
// against the real painted background must reach WCAG AA (4.5:1, large text 3:1).
test.use({ viewport: { width: 1440, height: 1000 } });

async function settle(page) {
  // The board uses scroll snapping: wait until the scroll position has stopped moving.
  let last = -1;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const y = await page.evaluate(() => scrollY);
    if (y === last) break;
    last = y;
    await page.waitForTimeout(120);
  }
  await page.evaluate(() => new Promise(resolve => {
    let frames = 0;
    const tick = () => (++frames >= 4 ? resolve() : requestAnimationFrame(tick));
    requestAnimationFrame(tick);
  }));
  await page.waitForTimeout(250);
}

async function measureScene(page, report, scene, options = {}) {
  await settle(page);
  const result = await measureContrast(page, options);
  report.scenes.push({
    scene,
    measured: result.items.length,
    failures: result.failures.map(formatFailure),
    excluded: [...new Set(result.excluded.map(item => item.selector))],
    skipped: [...new Set(result.skipped.map(item => `${item.selector} (${item.skipped})`))]
  });
}

async function finish(report, testInfo) {
  const body = JSON.stringify(report, null, 2);
  await testInfo.attach("contrast-report.json", { body, contentType: "application/json" });
  if (process.env.CONTRAST_REPORT_DIR) await writeFile(`${process.env.CONTRAST_REPORT_DIR}/${report.name}.json`, body);
  const failures = report.scenes.flatMap(scene => scene.failures.map(line => `${scene.scene}: ${line}`));
  expect(failures, `${failures.length} text element(s) below the contrast threshold`).toEqual([]);
}

for (const theme of ACT_THEMES) {
  test(`豪華版 ${theme}: 全場面の文字コントラスト`, async ({ page }, testInfo) => {
    test.setTimeout(240_000);
    const report = { name: `deluxe-${theme}`, theme, decorative: DECORATIVE_SELECTORS, scenes: [] };
    await installActShowcaseRoutes(page);
    await page.goto(`/act-showcase.html?id=${ACT_SLUG}&theme=${theme}`);
    await expect(page.locator("html")).toHaveAttribute("data-showcase-theme", theme);

    // ACCESS screen: timer-driven; measure once the seal has finished its own authorization transition.
    await expect(page.locator(".neotokyo-sequence__screen--opening")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".neotokyo-sequence__access-seal")).toHaveClass(/is-authorized/, { timeout: 5_000 });
    await measureScene(page, report, "access");

    // Each NEXT / ASSIGN label names the scene that has just finished typing.
    const advance = page.locator(".neotokyo-sequence__advance");
    const access = page.locator(".neotokyo-finale__access-button");
    for (let step = 0; step < 14; step += 1) {
      if (await access.isVisible()) break;
      await expect(advance).toBeVisible({ timeout: 15_000 });
      const label = ((await advance.textContent()) || "").trim();
      if (label === "NEXT // ACT SUMMARY") {
        await measureScene(page, report, `before-summary (${label})`);
        await advance.click({ force: true });
        break;
      }
      await measureScene(page, report, `step ${step + 1} (${label})`);
      await advance.click({ force: true });
      await expect(advance).not.toHaveText(label, { timeout: 15_000 });
    }
    await expect(access).toBeVisible({ timeout: 15_000 });
    await measureScene(page, report, "summary");
    await access.click({ force: true });

    // Final board: scroll through the whole page for each selected cast (the roster at the bottom switches casts).
    await expect(page.locator(".poster-v2-board")).toBeVisible();
    const frame = page.locator(".poster-v2-frame");
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await settle(page);
      const top = await frame.evaluate(element => element.getBoundingClientRect().top);
      if (Math.abs(top) < 1) break;
      await page.evaluate(delta => window.scrollBy(0, delta), top);
    }
    const castCount = await page.locator(".poster-v2-roster__item").count();
    for (let index = 0; index < castCount; index += 1) {
      if (index > 0) {
        await page.locator(".poster-v2-roster__item").nth(index).scrollIntoViewIfNeeded();
        await page.locator(".poster-v2-roster__item").nth(index).click();
        await settle(page);
      }
      // The frame itself is only opaque (a settled scene) when its top meets the viewport top.
      await page.evaluate(() => window.scrollTo(0, document.querySelector(".poster-v2-frame").getBoundingClientRect().top + scrollY));
      await measureScene(page, report, `board cast ${index + 1} frame`);
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0, part = 1; y < height; y += 800, part += 1) {
        await page.evaluate(top => window.scrollTo(0, top), y);
        await measureScene(page, report, `board cast ${index + 1} part ${part}`);
      }
    }
    await finish(report, testInfo);
  });

  test(`読み込み画面 ${theme}: 文字コントラスト`, async ({ page }, testInfo) => {
    const report = { name: `loading-${theme}`, theme, decorative: DECORATIVE_SELECTORS, scenes: [] };
    const release = await installHeldActShowcaseRoutes(page);
    await page.goto(`/act-showcase.html?id=${ACT_SLUG}&theme=${theme}`);
    await expect(page.locator(".cinematic-intro__title")).toHaveText("ACT FILE // ACCESS");
    await measureScene(page, report, "loading");
    release();
    await finish(report, testInfo);
  });

  test(`スタンダード版 ${theme}: 文字コントラスト`, async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    const report = { name: `standard-${theme}`, theme, decorative: DECORATIVE_SELECTORS, scenes: [] };
    await installActShowcaseRoutes(page);
    await page.goto(`/act-showcase-standard.html?id=${ACT_SLUG}&theme=${theme}`);
    await expect(page.locator(".cast-card").first()).toBeVisible();
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0, part = 1; y < height; y += 800, part += 1) {
      await page.evaluate(top => window.scrollTo(0, top), y);
      await measureScene(page, report, `standard part ${part}`);
    }
    await finish(report, testInfo);
  });
}
