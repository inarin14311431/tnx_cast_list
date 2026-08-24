import { test, expect } from "@playwright/test";
import { getTestCastId, hasAuthCredentials, waitForEditorReady } from "./helpers.js";

test("編集画面にHELPボタンが表示される", async ({ page }) => {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");

  await page.goto(`/sheet.html?id=${getTestCastId()}`);
  await waitForEditorReady(page);

  const help = page.locator("#sheet-global-help");
  await expect(help).toBeVisible();
  await help.click();
  await expect(page.locator("#sheet-help-dialog")).toBeVisible();
});
