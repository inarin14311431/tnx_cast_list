import { test, expect } from "@playwright/test";
import { ACT_SLUG, ACT_THEMES, installActShowcaseRoutes } from "./fixtures/act-showcase-data.js";

// Content that used to be cut off or empty, in every theme (the fixture's 2nd cast has no image, so the
// "SCAN FAILED" placeholder is used):
//  - the placeholder's words must stay inside the frame whatever its proportions (assign, summary, board)
//  - summary cast names wrap instead of ending in "…"
//  - the final board's visual identification code is not cut at the plate's right edge
//  - the assign panel has no empty plate at its top
test.use({ viewport: { width: 1440, height: 1000 } });

// "SCAN FAILED" spans roughly the middle 45% of the 800x800 placeholder.
const TEXT_START = 0.26;
const TEXT_END = 0.74;

async function placeholderInsideFrame(page, imageSelector) {
  const image = page.locator(imageSelector).first();
  await expect(image).toBeVisible();
  const box = await image.evaluate(element => {
    const frame = element.parentElement.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    const fit = getComputedStyle(element).objectFit;
    // Where the picture is really drawn inside the element (object-fit), not just the element's own box.
    const scale = fit === "cover" ? Math.max(rect.width / element.naturalWidth, rect.height / element.naturalHeight)
      : fit === "contain" ? Math.min(rect.width / element.naturalWidth, rect.height / element.naturalHeight) : 1;
    const drawnWidth = element.naturalWidth * scale;
    return { frameLeft: frame.left, frameRight: frame.right, drawnLeft: rect.left + (rect.width - drawnWidth) / 2, drawnWidth, naturalWidth: element.naturalWidth };
  });
  expect(box.naturalWidth).toBeGreaterThan(0);
  expect(box.drawnLeft + box.drawnWidth * TEXT_START, "text starts inside the frame").toBeGreaterThanOrEqual(box.frameLeft - 0.5);
  expect(box.drawnLeft + box.drawnWidth * TEXT_END, "text ends inside the frame").toBeLessThanOrEqual(box.frameRight + 0.5);
}

for (const theme of ACT_THEMES) {
  test(`${theme}: 代替画像の文字・省略記号・コード行・空の枠`, async ({ page }) => {
    test.setTimeout(150_000);
    await installActShowcaseRoutes(page);
    await page.goto(`/act-showcase.html?id=${ACT_SLUG}&theme=${theme}`);
    const advance = page.locator(".neotokyo-sequence__advance");
    const access = page.locator(".neotokyo-finale__access-button");

    let assignChecked = false;
    for (let step = 0; step < 80 && !(await access.isVisible()); step += 1) {
      if (await advance.isVisible()) {
        const label = ((await advance.textContent()) || "").trim();
        // PC2's assign screen (its cast has no image) is the one after "NEXT // HANDOUT 03" appears.
        if (label === "NEXT // HANDOUT 03" && !assignChecked) {
          assignChecked = true;
          await page.waitForTimeout(600);
          await placeholderInsideFrame(page, ".neotokyo-sequence__cast--linked .neotokyo-sequence__cast-image img[src*='scan-failed.webp']");
          // No empty plate above the cast: the cast-detail has no generated box.
          const plate = await page.evaluate(() => getComputedStyle(document.querySelector(".neotokyo-sequence__cast--linked .neotokyo-sequence__cast-detail"), "::before").content);
          expect(plate).toBe("none");
        }
        await advance.click({ force: true });
      }
      await page.waitForTimeout(800);
    }
    expect(assignChecked).toBe(true);

    // Summary: the placeholder in the narrow frame, and every cast name wraps instead of being cut.
    await expect(access).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(800);
    await placeholderInsideFrame(page, ".neotokyo-sequence__summary-cast-image img[src*='scan-failed.webp']");
    const names = await page.locator(".neotokyo-sequence__summary-cast-body h3").evaluateAll(nodes => nodes.map(node => {
      const style = getComputedStyle(node);
      return { text: node.textContent, ellipsis: style.textOverflow === "ellipsis" && style.whiteSpace === "nowrap", clipped: node.scrollHeight > node.clientHeight + 1 || node.scrollWidth > node.clientWidth + 1, lines: Math.round(node.getBoundingClientRect().height / parseFloat(style.lineHeight)) };
    }));
    expect(names.length).toBe(3);
    for (const name of names) {
      expect(name.ellipsis, `${name.text} must not end in an ellipsis`).toBe(false);
      expect(name.clipped, `${name.text} must not be clipped`).toBe(false);
      expect(name.lines, `${name.text} wraps to at most two lines`).toBeLessThanOrEqual(2);
    }

    // Final board, cast 2 (no image): placeholder inside the visual frame, identification code not cut.
    await access.click({ force: true });
    await expect(page.locator(".poster-v2-board")).toBeVisible();
    await page.locator(".poster-v2-roster__item").nth(1).scrollIntoViewIfNeeded();
    await page.locator(".poster-v2-roster__item").nth(1).click();
    await page.waitForTimeout(900);
    await placeholderInsideFrame(page, ".poster-v2-visual > img[src*='scan-failed.webp']");
    const code = await page.locator(".poster-v2-visual__code").evaluate(node => {
      const plate = node.closest(".poster-v2-visual__caption").getBoundingClientRect();
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return { text: node.textContent, ellipsis: style.textOverflow === "ellipsis" && style.whiteSpace === "nowrap", clipped: node.scrollWidth > node.clientWidth + 1, inside: rect.right <= plate.right + 0.5 && rect.left >= plate.left - 0.5 };
    });
    expect(code.ellipsis).toBe(false);
    expect(code.clipped).toBe(false);
    expect(code.inside).toBe(true);
    expect(code.text).toMatch(/^VISUAL TRACE \/\/ NX-[0-9A-F]{4}-[0-9A-F]{4} \/\/ NODE:PUBLIC$/);
  });
}
