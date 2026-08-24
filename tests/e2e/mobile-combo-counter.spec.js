import { test, expect } from "@playwright/test";
import { getTestCastId, hasAuthCredentials, watchPageErrors, watchStaticAssetErrors } from "./helpers.js";

test("モバイル表示のコンボ使用回数を再読み込み後も保持しRESETできる", async ({ page }) => {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");

  const assertNoErrors = watchPageErrors(page);
  const assertNoAssetErrors = watchStaticAssetErrors(page);
  const url = `/cast.html?id=${encodeURIComponent(getTestCastId())}&mobile=1`;

  await page.goto(url);
  const root = page.locator("#mobile-cast-view");
  await expect(root).toBeVisible();

  let card = root.locator('[data-mobile-counter-id][data-mobile-counter-card-tap="1"]').first();
  await expect(card).toBeVisible();

  let reset = card.locator("[data-mobile-counter-reset]");
  let firstBox = card.locator("[data-mobile-counter-box]").first();

  await reset.click();
  await expect(firstBox).toHaveAttribute("aria-pressed", "false");
  await expect(firstBox.locator("span")).toHaveText("□");

  await firstBox.click();
  await expect(firstBox).toHaveAttribute("aria-pressed", "true");
  await expect(firstBox.locator("span")).toHaveText("☑");

  await page.reload();
  await expect(root).toBeVisible();
  card = root.locator('[data-mobile-counter-id][data-mobile-counter-card-tap="1"]').first();
  firstBox = card.locator("[data-mobile-counter-box]").first();
  reset = card.locator("[data-mobile-counter-reset]");
  await expect(firstBox).toHaveAttribute("aria-pressed", "true");
  await expect(firstBox.locator("span")).toHaveText("☑");

  await reset.click();
  await expect(firstBox).toHaveAttribute("aria-pressed", "false");
  await expect(firstBox.locator("span")).toHaveText("□");

  await page.reload();
  await expect(root).toBeVisible();
  card = root.locator('[data-mobile-counter-id][data-mobile-counter-card-tap="1"]').first();
  firstBox = card.locator("[data-mobile-counter-box]").first();
  await expect(firstBox).toHaveAttribute("aria-pressed", "false");
  await expect(firstBox.locator("span")).toHaveText("□");

  assertNoErrors();
  assertNoAssetErrors();
});
