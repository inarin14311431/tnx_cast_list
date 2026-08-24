import { test, expect } from "@playwright/test";
import { getTestCastId, hasAuthCredentials, waitForEditorReady, watchPageErrors, watchStaticAssetErrors } from "./helpers.js";

test("保存済みログイン状態を再利用できる", async ({ page }) => {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");

  await page.goto("/account.html");
  await expect(page).not.toHaveURL(/login\.html/);
  await expect(page.locator("body")).toContainText(/ACCOUNT|アカウント/i);
  await expect(page.locator("#account-email")).not.toHaveText(/読み込み中/);
});

test("編集画面のエクスポートモジュールは循環せず一度だけ初期化される", async ({ page }) => {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");
  const assertNoErrors = watchPageErrors(page);
  const assertNoAssetErrors = watchStaticAssetErrors(page);

  await page.goto(`/sheet.html?id=${getTestCastId()}`);
  await waitForEditorReady(page);

  await expect(page.locator("#cocofolia-copy-button")).toBeVisible();
  await expect(page.locator("#udonarium-export-button")).toBeVisible();
  await expect(page.locator("script#tnx-cocofolia-export-module")).toHaveCount(1);
  await expect(page.locator("script#tnx-udonarium-export-module")).toHaveCount(1);

  assertNoErrors();
  assertNoAssetErrors();
});
