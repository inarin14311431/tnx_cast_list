import { test, expect } from "@playwright/test";

test("production cast transfer exposes bookmarklet tools instead of POST dialog", async ({ page }) => {
  await page.goto("/tests/e2e/fixtures/bookmarklet-transfer-mode.html?id=TNX-E2E");

  await expect(page.locator("html")).toHaveAttribute("data-transfer-mode", "bookmarklet");
  await expect(page.locator("#direct-transfer-button")).toHaveCount(0);
  await expect(page.locator("#transfer-tsv-copy-button")).toBeVisible();
  await expect(page.locator("#transfer-bookmarklet-copy-button")).toBeVisible();
  await expect(page.locator("dialog.cast-transfer-dialog")).toHaveCount(0);
});

test("PC editor keeps one bookmarklet transfer pair and copies the bookmarklet", async ({ page }) => {
  await page.goto("/tests/e2e/fixtures/bookmarklet-transfer-editor.html?id=TNX-E2E");

  await expect(page.locator("html")).toHaveAttribute("data-transfer-mode", "bookmarklet");
  await expect(page.locator("#direct-transfer-button")).toHaveCount(0);
  await expect(page.locator("#transfer-tsv-copy-button")).toHaveCount(1);
  const bookmarklet = page.locator("#transfer-bookmarklet-copy-button");
  await expect(bookmarklet).toHaveCount(1);
  await bookmarklet.click();
  await expect.poll(() => page.evaluate(() => window.__copiedText)).toMatch(/^javascript:/);
  await expect.poll(() => page.evaluate(() => window.__copiedText)).toContain("tnx-transfer-bookmarklet.js");
});

test("BM style skill transfer trims surplus rows and preserves experience", async ({ page }) => {
  await page.goto("/tests/e2e/fixtures/bookmarklet-style-row-trim.html");
  await expect(page.locator("html")).toHaveAttribute("data-fixture-ready", "1");

  const rows = page.locator("#superhumanskills tbody tr");
  await expect(rows).toHaveCount(2);
  await expect(page.locator("#superhumanskills\\.0\\.name")).toHaveValue("†転記秘技");
  await expect(page.locator("#superhumanskills\\.001\\.name")).toHaveValue("転記特技");
  await expect(page.locator("#superhumanskills\\.0\\.expbase")).toHaveValue("20");
  await expect(page.locator("#superhumanskills\\.001\\.expbase")).toHaveValue("10");
  await expect(page.locator("#exp\\.superhumanskills")).toHaveValue("50");
  await expect(page.locator('input[value="余剰技能C"]')).toHaveCount(0);
  await expect(page.locator('input[value="余剰技能D"]')).toHaveCount(0);
});
