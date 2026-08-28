import { test, expect } from "@playwright/test";
import { getTestCastId, hasAuthCredentials, waitForCastReady, watchPageErrors, watchStaticAssetErrors } from "./helpers.js";

test("テストキャストの閲覧画面を正常に表示できる", async ({ page }) => {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");
  const assertNoErrors = watchPageErrors(page);
  const assertNoAssetErrors = watchStaticAssetErrors(page);
  await page.goto(`/cast.html?id=${getTestCastId()}`);
  await waitForCastReady(page);
  await expect(page.locator("body")).not.toContainText("指定されたキャストは存在しません");
  assertNoErrors();
  assertNoAssetErrors();
});

test("PC閲覧のデータ出力ボタンは指定順で表示する", async ({ page }) => {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");
  await page.goto(`/cast.html?id=${getTestCastId()}`);
  await waitForCastReady(page);

  const expected = [
    "udonarium-export-button",
    "cocofolia-copy-button",
    "transfer-tsv-copy-button",
    "transfer-bookmarklet-copy-button"
  ];
  const readOrder = () => page.locator(".cast-header__export-actions > *").evaluateAll((nodes, ids) =>
    nodes.map(node => node.id).filter(id => ids.includes(id)), expected);

  await expect.poll(readOrder).toEqual(expected);
});

test("閲覧画面に意図しない横スクロールがない", async ({ page }) => {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");
  await page.goto(`/cast.html?id=${getTestCastId()}`);
  await waitForCastReady(page);
  const width = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth
  }));
  expect(width.scroll).toBeLessThanOrEqual(width.client + 2);
});

test("PC閲覧のアウトフィット列は現行ラベルを使う", async ({ page }) => {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");
  await page.goto(`/cast.html?id=${getTestCastId()}`);
  await waitForCastReady(page);

  const tables = page.locator(".cast-outfit-table");
  if (await tables.count()) {
    await expect(page.locator(".cast-outfit-col--concealment").first()).toBeVisible();
    await expect(page.locator(".cast-outfit-col--concealment_penalty").first()).toBeVisible();
    await expect(page.locator(".cast-outfit-col--concealment").first()).toHaveText("隠匿値");
    await expect(page.locator(".cast-outfit-col--concealment_penalty").first()).toHaveText("隠匿修正");
  }

  const tronOrVehicle = page.locator('[data-outfit-category="tron"], [data-outfit-category="vehicle"]');
  if (await tronOrVehicle.count()) {
    await expect(tronOrVehicle.first().locator(".cast-outfit-col--cs_modifier").first()).toHaveText("CS修正");
  }

  await expect(page.locator('.cast-outfit-col--control_value, .cast-outfit-col--cs_value')).toHaveCount(0);
});

test("モバイル閲覧でも旧CS項目をサイバーウェア・その他に表示しない", async ({ page }) => {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");
  await page.goto(`/cast.html?id=${getTestCastId()}&mobile=1`);
  await page.locator("#mobile-cast-view .mobile-cast-main").waitFor({ state: "visible" });

  for (const category of ["サイバーウェア", "その他"]) {
    const group = page.locator(".mobile-outfit-group").filter({ has: page.getByRole("heading", { name: category, exact: true }) });
    if (await group.count()) {
      await expect(group).not.toContainText(/\bCS\b|CS修正/);
    }
  }
});

test("簡易表示は全アウトフィットで購入と隠匿のペア列をコア描画する", async ({ page }) => {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");
  await page.goto(`/cast.html?id=${getTestCastId()}`);
  await waitForCastReady(page);
  await page.getByRole("button", { name: /簡易表示/ }).click();
  await expect(page.locator("#quick-sheet")).toBeVisible();

  const tables = page.locator(".quick-sheet__outfit-table");
  if (!(await tables.count())) return;

  for (let index = 0; index < await tables.count(); index += 1) {
    const table = tables.nth(index);
    await expect(table.locator("thead .quick-sheet__outfit-purchase")).toHaveText("購入");
    await expect(table.locator("thead .quick-sheet__outfit-concealment")).toHaveText("隠匿");
    const firstDataRow = table.locator("tbody tr").first();
    if (await firstDataRow.count()) {
      await expect(firstDataRow.locator(".quick-sheet__outfit-purchase")).toContainText("/");
      await expect(firstDataRow.locator(".quick-sheet__outfit-concealment")).toContainText("/");
    }
  }

  await expect(page.locator("#quick-sheet-pages .quick-sheet__outfit-cs-value")).toHaveCount(0);
});
