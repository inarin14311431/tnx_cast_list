import { test, expect } from "@playwright/test";
import { hasAuthCredentials } from "./helpers.js";

test("新規キャストは固定一般技能・空欄・社会・コネの初期構成を表示する", async ({ page }) => {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");
  await page.goto("/sheet.html");
  await expect(page).not.toHaveURL(/login\.html/);
  await expect(page.locator("#save-button")).toBeVisible();
  await expect(page.locator("#visibility")).toHaveValue("private");

  const generalRows = page.locator('#general-skills section[data-skill-category="general"] tbody tr[data-skill-key]');
  const blankRows = page.locator('#general-skills tr[data-general-slot-column]');
  const socialRows = page.locator('#general-skills section[data-skill-category="social"] tbody tr[data-skill-key]');
  const connectionRows = page.locator('#general-skills section[data-skill-category="connection"] tbody tr[data-skill-key]');

  await expect(generalRows).toHaveCount(20);
  await expect(blankRows).toHaveCount(4);
  await expect(socialRows).toHaveCount(4);
  await expect(connectionRows).toHaveCount(3);

  await expect(socialRows.nth(0).locator('[data-f="name"]')).toHaveValue("社会：N◎VA");
  for (let i = 1; i < 4; i++) await expect(socialRows.nth(i).locator('[data-f="name"]')).toHaveValue("社会：");
  for (let i = 0; i < 3; i++) await expect(connectionRows.nth(i).locator('[data-f="name"]')).toHaveValue("コネ：");

  await expect(blankRows.nth(0)).toHaveAttribute("data-general-slot-column", "left");
  await expect(blankRows.nth(1)).toHaveAttribute("data-general-slot-column", "left");
  await expect(blankRows.nth(2)).toHaveAttribute("data-general-slot-column", "right");
  await expect(blankRows.nth(3)).toHaveAttribute("data-general-slot-column", "right");
});
