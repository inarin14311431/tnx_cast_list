import { test, expect } from "@playwright/test";
import { hasAuthCredentials } from "./helpers.js";

const MARK_SIZE = 10;

async function assertMarks(root) {
  const marks = root.locator(".tnx-style-mark");
  const count = await marks.count();
  expect(count).toBeGreaterThan(0);
  const boxes = await marks.evaluateAll(elements => elements.map(element => {
    const rect = element.getBoundingClientRect();
    return [rect.width, rect.height];
  }));
  for (const [width, height] of boxes) {
    expect(width).toBe(MARK_SIZE);
    expect(height).toBe(MARK_SIZE);
  }
}

test("indexの◎と●が同じ10px外寸で描画される", async ({ page }) => {
  await page.goto("/index.html");
  await expect(page.locator("#cast-grid")).toBeVisible();
  await page.waitForFunction(() => document.querySelectorAll(".cast-card__style-chip").length > 0);
  const raw = page.locator(".cast-card__style-chip b", { hasText: /[◎●]/ });
  await expect(raw).toHaveCount(0);
  await assertMarks(page.locator("#cast-grid"));
});

test("accountの◎と●が同じ10px外寸で描画される", async ({ page }) => {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");
  await page.goto("/account.html");
  await expect(page).not.toHaveURL(/login\.html/);
  const cards = page.locator(".owned-cast");
  test.skip(await cards.count() === 0, "登録キャストがないためスキップ");
  const raw = page.locator(".owned-cast__style b", { hasText: /[◎●]/ });
  await expect(raw).toHaveCount(0);
  await assertMarks(page.locator("#owned-casts"));
});
