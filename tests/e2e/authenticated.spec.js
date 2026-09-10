import { test, expect } from "./safe-test.js";
import { getTestCastId, hasAuthCredentials, waitForEditorReady, watchPageErrors, watchStaticAssetErrors } from "./helpers.js";

test("保存済みログイン状態を再利用できる", async ({ page }) => {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");

  await page.goto("/account.html");
  await expect(page).not.toHaveURL(/login\.html/);
  await expect(page.locator("body")).toContainText(/ACCOUNT|アカウント/i);
  await expect(page.locator("#account-email")).not.toHaveText(/読み込み中/);
});

test("PC編集画面は現行の主要操作を一度だけ初期化し静的資産エラーを出さない", async ({ page }) => {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");
  const assertNoErrors = watchPageErrors(page);
  const assertNoAssetErrors = watchStaticAssetErrors(page);

  await page.goto(`/sheet.html?id=${getTestCastId()}`);
  await waitForEditorReady(page);

  await expect(page.locator("#save-button")).toBeVisible();
  await expect(page.locator("#legacy-import-open")).toBeVisible();
  await expect(page.locator("#sheet-combo-open")).toBeVisible();
  await expect(page.locator('script[src*="/js/sheet.js"]')).toHaveCount(1);

  assertNoErrors();
  assertNoAssetErrors();
});
