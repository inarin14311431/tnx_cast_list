import { test, expect } from "@playwright/test";
import { hasAuthCredentials } from "./helpers.js";

test("一般技能の追加は少ない側へ入り、同数なら左を選ぶ", async ({ page }) => {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");
  await page.goto("/sheet.html");
  await expect(page).not.toHaveURL(/login\.html/);
  await expect(page.locator("#save-button")).toBeVisible();

  const leftRows = page.locator("#general-skills .general-skill-column--first tbody tr");
  const rightRows = page.locator("#general-skills .general-skill-column--second tbody tr");
  const initialLeft = await leftRows.count();
  const initialRight = await rightRows.count();

  expect(initialLeft).toBe(initialRight);

  await page.locator("#add-general").click();
  await expect(leftRows).toHaveCount(initialLeft + 1);
  await expect(rightRows).toHaveCount(initialRight);
  await expect(leftRows.last()).toHaveAttribute("data-general-slot-column", "left");

  await page.locator("#add-general").click();
  await expect(leftRows).toHaveCount(initialLeft + 1);
  await expect(rightRows).toHaveCount(initialRight + 1);
  await expect(rightRows.last()).toHaveAttribute("data-general-slot-column", "right");
});
