import { test, expect } from "@playwright/test";
import { watchPageErrors } from "./helpers.js";

test("トップページを正常に表示できる", async ({ page }) => {
  const assertNoErrors = watchPageErrors(page);
  await page.goto("/index.html");
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator("#cast-grid")).toBeVisible();
  await expect(page.locator(".site-title")).toContainText(/CAST ARCHIVE/i);
  assertNoErrors();
});

test("トップページに意図しない横スクロールがない", async ({ page }) => {
  await page.goto("/index.html");
  const width = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth
  }));
  expect(width.scroll).toBeLessThanOrEqual(width.client + 2);
});
