import { test, expect } from "@playwright/test";
import { getTestCastId, hasAuthCredentials, waitForEditorReady, watchPageErrors } from "./helpers.js";

test("モバイル編集の消費経験点はPC版の正規計算と一致する", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobileプロジェクト専用");
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");

  const assertNoErrors = watchPageErrors(page);
  await page.goto(`/sheet.html?id=${encodeURIComponent(getTestCastId())}`);
  await waitForEditorReady(page);

  const desktopTotal = page.locator("#exp-total");
  const mobileTotal = page.locator("#mobile-exp-total");
  await expect(mobileTotal).toHaveCount(1);
  await expect.poll(async () => await mobileTotal.textContent()).toBe(await desktopTotal.textContent());

  assertNoErrors();
});
