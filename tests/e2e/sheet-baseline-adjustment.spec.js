import { test, expect } from "@playwright/test";
import { getTestCastId, hasAuthCredentials, waitForEditorReady } from "./helpers.js";

async function openEditor(page) {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");
  await page.goto(`/sheet.html?id=${getTestCastId()}`);
  await waitForEditorReady(page);
}

const ABILITY_KEYS = ["reason", "passion", "life", "mundane"];

test("スタイル変更は自動基準値だけ追従し手入力した能力値・制御値を保持する", async ({ page }) => {
  await openEditor(page);

  for (let i = 1; i <= 3; i++) await page.locator(`#style-${i}`).selectOption("");
  for (const key of ABILITY_KEYS) {
    await page.locator(`#${key}-base`).fill("0");
    await page.locator(`#${key}-control-base`).fill("0");
  }

  await page.locator("#style-1").selectOption("カブキ");
  await expect(page.locator("#life-base")).toHaveValue("2");
  await expect(page.locator("#life-control-base")).toHaveValue("4");
  await expect(page.locator("#passion-base")).toHaveValue("3");

  await page.locator("#reason-base").fill("9");
  await page.locator("#life-control-base").fill("8");

  await page.locator("#style-1").selectOption("カタナ");

  await expect(page.locator("#reason-base")).toHaveValue("9");
  await expect(page.locator("#life-control-base")).toHaveValue("8");
  await expect(page.locator("#life-base")).toHaveValue("3");
  await expect(page.locator("#passion-base")).toHaveValue("0");
  await expect(page.locator("#mundane-control-base")).toHaveValue("3");
});
