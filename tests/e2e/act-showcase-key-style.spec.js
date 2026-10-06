import { test, expect } from "@playwright/test";
import { ACT_SLUG, ACT_THEMES, installActShowcaseRoutes, showcaseData } from "./fixtures/act-showcase-data.js";

// The final board's KEY STYLE is each cast's assigned style in cast order (not the first three styles of the
// first cast), and it stays inside its frame even with six casts.
const SIX_STYLES = ["ブラックハウンド", "ミストレス", "ニューロ", "トーキー", "カリスマ", "フェイト"];
const sixCasts = {
  ...showcaseData,
  casts: SIX_STYLES.map((style, index) => ({
    ...showcaseData.casts[index % 3],
    slot: `CAST 0${index + 1}`,
    serial: `TNX-VISUAL10${index}`,
    fullName: `“テスト${index + 1}” 担当${style}`,
    styles: [{ label: `${style}◎`, handoutRole: true }, { label: "カゼ●", handoutRole: false }]
  }))
};

async function openBoard(page, data, theme) {
  await installActShowcaseRoutes(page, data);
  await page.goto(`/act-showcase.html?id=${ACT_SLUG}&theme=${theme}`);
  const access = page.locator(".neotokyo-finale__access-button");
  const advance = page.locator(".neotokyo-sequence__advance");
  await expect(page.locator(".neotokyo-sequence__access-seal")).toHaveClass(/is-authorized/, { timeout: 15_000 });
  for (let step = 0; step < 14; step += 1) {
    if (await access.isVisible()) break;
    await expect(advance).toBeVisible({ timeout: 15_000 });
    const label = ((await advance.textContent()) || "").trim();
    await advance.click({ force: true });
    if (label === "NEXT // ACT SUMMARY") break;
    await expect(advance).not.toHaveText(label, { timeout: 15_000 });
  }
  await expect(access).toBeVisible({ timeout: 20_000 });
  await access.click({ force: true });
  await expect(page.locator(".poster-v2-act-meta__cell.is-style strong")).toBeVisible();
}

test("KEY STYLE: 担当スタイルをPC順に × でつなぐ(3人)", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openBoard(page, showcaseData, "nova");
  await expect(page.locator(".poster-v2-act-meta__cell.is-style > span")).toHaveText("KEY STYLE");
  await expect(page.locator(".poster-v2-act-meta__cell.is-style strong")).toHaveText("カブキ × カブト × トーキー");
  // switching the cast does not change it
  await page.locator(".poster-v2-roster__item").nth(1).click();
  await expect(page.locator(".poster-v2-act-meta__cell.is-style strong")).toHaveText("カブキ × カブト × トーキー");
});

for (const [width, height] of [[1440, 1000], [1024, 768], [390, 844]]) {
  test(`KEY STYLE: 6人でも枠からはみ出さない (${width}px)`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height });
    await openBoard(page, sixCasts, ACT_THEMES[width % ACT_THEMES.length]);
    const value = page.locator(".poster-v2-act-meta__cell.is-style strong");
    await expect(value).toHaveText(SIX_STYLES.join(" × "));
    const fit = await page.evaluate(() => {
      const cell = document.querySelector(".poster-v2-act-meta__cell.is-style");
      const strong = cell.querySelector("strong");
      const frame = document.querySelector(".poster-v2-frame").getBoundingClientRect();
      const box = cell.getBoundingClientRect();
      const text = strong.getBoundingClientRect();
      return {
        textInsideCell: text.left >= box.left - 0.5 && text.right <= box.right + 0.5 && strong.scrollWidth <= strong.clientWidth + 1,
        cellInsideFrame: box.left >= frame.left - 0.5 && box.right <= frame.right + 0.5,
        lines: Math.round(text.height / parseFloat(getComputedStyle(strong).lineHeight))
      };
    });
    expect(fit.textInsideCell, JSON.stringify(fit)).toBe(true);
    expect(fit.cellInsideFrame, JSON.stringify(fit)).toBe(true);
  });
}

test("KEY STYLE: 担当スタイルが1件もないアクトは —", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const none = { ...showcaseData, casts: showcaseData.casts.map(cast => ({ ...cast, styles: cast.styles.map(style => ({ ...style, handoutRole: false })) })) };
  await openBoard(page, none, "nova");
  await expect(page.locator(".poster-v2-act-meta__cell.is-style strong")).toHaveText("—");
});
