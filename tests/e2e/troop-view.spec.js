import { test, expect } from "@playwright/test";
import { getTestCastId, getTestTroopId, hasAuthCredentials, waitForCastReady, watchPageErrors, watchStaticAssetErrors } from "./helpers.js";

test("トループ閲覧画面は編集画面準拠の読取り専用構成で表示する", async ({ page }, testInfo) => {
  const assertNoErrors = watchPageErrors(page);
  const assertNoAssetErrors = watchStaticAssetErrors(page);
  await page.goto(`/troop.html?id=${getTestTroopId()}`);

  const view = page.locator("#troop-view");
  await expect(view).toBeVisible();
  await expect(view).toHaveClass(/troop-view-readonly/);
  await expect(page.locator(".troop-view-general-field-heads")).toBeVisible();
  if (testInfo.project.name === "chromium") {
    await expect(page.locator(".troop-view-style-field-heads")).toBeVisible();
    await expect(page.locator(".troop-view-outfit-fields")).toBeVisible();
  } else {
    await expect(page.locator(".troop-view-style-field-heads")).toBeHidden();
    await expect(page.locator(".troop-view-outfit-fields")).toBeHidden();
  }

  const abilityPairs = page.locator("#troop-abilities-view > .troop-ability-pair");
  await expect(abilityPairs).toHaveCount(4);
  await expect(page.locator("#troop-abilities-view > .troop-cs-card")).toHaveCount(1);
  for (let index = 0; index < 4; index += 1) {
    await expect(abilityPairs.nth(index).locator("strong")).toHaveText(/^\d{1,2}／\d{1,2}$/);
  }

  const copyButton = page.locator("#troop-combos-view .troop-combo-copy").first();
  await expect(copyButton).toBeVisible();
  await copyButton.click();
  await expect(copyButton).toHaveClass(/is-copied/);

  const width = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth
  }));
  expect(width.scroll).toBeLessThanOrEqual(width.client + 2);
  assertNoErrors();
  assertNoAssetErrors();
});

test("キャスト側トループモーダルはセクション色とCS付き能力値を使う", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "PC専用モーダルのため");
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");
  const assertNoErrors = watchPageErrors(page);
  await page.goto(`/cast.html?id=${getTestCastId()}`);
  await waitForCastReady(page);

  await page.getByRole("button", { name:/トループ/ }).click();
  const dialog = page.locator("#cast-troop-dialog");
  await expect(dialog).toBeVisible();
  await dialog.locator(".cast-troop-picker button").first().click();

  await expect(dialog.locator(".cast-troop-block--abilities")).toBeVisible();
  await expect(dialog.locator(".cast-troop-block--general")).toBeVisible();
  await expect(dialog.locator(".cast-troop-block--style-skills")).toBeVisible();
  await expect(dialog.locator(".cast-troop-block--combos")).toBeVisible();
  await expect(dialog.locator(".cast-troop-block--outfits")).toBeVisible();
  await expect(dialog.locator(".cast-troop-ability-pair")).toHaveCount(5);
  await expect(dialog.locator(".cast-troop-ability-pair--cs strong")).not.toHaveText("");
  await expect(dialog.locator(".cast-troop-combos .troop-combo-copy").first()).toBeVisible();
  assertNoErrors();
});
