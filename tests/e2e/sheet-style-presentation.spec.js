import { test, expect } from "@playwright/test";
import { getTestCastId, hasAuthCredentials, waitForEditorReady } from "./helpers.js";

async function openEditor(page) {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");
  await page.goto(`/sheet.html?id=${getTestCastId()}`);
  await waitForEditorReady(page);
}

test("神業表示と3枠選択警告はスタイル選択状態に追従する", async ({ page }) => {
  await openEditor(page);

  for (let i = 1; i <= 3; i++) await page.locator(`#style-${i}`).selectOption("");
  await expect(page.locator("#style-warning")).toHaveText("3枠すべてのスタイルを選択してください。");
  for (let i = 1; i <= 3; i++) {
    await expect(page.locator(`#divine-${i}`)).toHaveText("未選択");
    await expect(page.locator(`#divine-${i}-yomi`)).toHaveText("");
  }

  await page.locator("#style-1").selectOption("カブキ");
  await page.locator("#style-2").selectOption("カタナ");
  await page.locator("#style-3").selectOption("ウツワ");

  await expect(page.locator("#divine-1")).toHaveText("チャイ");
  await expect(page.locator("#divine-2")).toHaveText("死の舞踏");
  await expect(page.locator("#divine-2-yomi")).toHaveText("ダンス・マカブル");
  await expect(page.locator("#divine-3")).toHaveText("神意");
  await expect(page.locator("#divine-3-yomi")).toHaveText("ミラクル");
  await expect(page.locator("#style-warning")).toHaveText("");

  await page.locator("#style-2").selectOption("");
  await expect(page.locator("#divine-2")).toHaveText("未選択");
  await expect(page.locator("#style-warning")).toHaveText("3枠すべてのスタイルを選択してください。");
});
