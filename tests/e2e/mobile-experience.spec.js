import { test, expect } from "./safe-test.js";
import { getTestCastId, hasAuthCredentials, waitForEditorReady, watchPageErrors } from "./helpers.js";

test("モバイル編集の読込はPC版の正規消費経験点を変えない", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobileプロジェクト専用");
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");

  const assertNoErrors = watchPageErrors(page);
  const castId = encodeURIComponent(getTestCastId());

  await page.goto(`/sheet.html?id=${castId}`);
  await waitForEditorReady(page);
  await page.waitForLoadState("networkidle");
  await expect(page.locator("#exp-total")).toHaveText(/^-?\d+(?:＋\d+)?$/);
  const before = (await page.locator("#exp-total").textContent())?.trim();

  await page.goto(`/sheet-mobile.html?id=${castId}`);
  await expect(page.locator('[data-mobile-character-field="character_name"]')).not.toHaveValue("");
  await expect(page.locator("#mobile-style-summary")).not.toBeEmpty();
  await expect(page.locator("#mobile-ability-summary")).not.toBeEmpty();
  await expect(page.locator("#mobile-outfits")).not.toBeEmpty();

  await page.goto(`/sheet.html?id=${castId}`);
  await waitForEditorReady(page);
  await page.waitForLoadState("networkidle");
  await expect(page.locator("#exp-total")).toHaveText(before);

  assertNoErrors();
});
