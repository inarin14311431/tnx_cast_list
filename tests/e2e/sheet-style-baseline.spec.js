import { test, expect } from "@playwright/test";
import { getTestCastId, hasAuthCredentials, waitForEditorReady } from "./helpers.js";

async function openEditor(page) {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");
  await page.goto(`/sheet.html?id=${getTestCastId()}`);
  await waitForEditorReady(page);
}

const ABILITY_KEYS = ["reason", "passion", "life", "mundane"];

async function resetStylesAndBases(page) {
  for (const key of ABILITY_KEYS) {
    await page.locator(`#${key}-base`).fill("0");
    await page.locator(`#${key}-control-base`).fill("0");
  }
  for (let i = 1; i <= 3; i++) await page.locator(`#style-${i}`).selectOption("");
}

async function expectBaselines(page, expected) {
  for (const [key, [ability, control]] of Object.entries(expected)) {
    await expect(page.locator(`#${key}-base`)).toHaveValue(String(ability));
    await expect(page.locator(`#${key}-control-base`)).toHaveValue(String(control));
  }
}

test("スタイル基準値は通常スタイルとウツワ属性の能力値・制御値へ反映される", async ({ page }) => {
  await openEditor(page);
  await resetStylesAndBases(page);

  await page.locator("#style-1").selectOption("カブキ");
  await expect(page.locator("#divine-1")).toHaveText("チャイ");
  await expectBaselines(page, {
    reason: [0, 3],
    passion: [3, 5],
    life: [2, 4],
    mundane: [2, 4]
  });

  await page.locator("#style-1").selectOption("ウツワ");
  await expect(page.locator("#style-1-attribute-wrap")).toBeVisible();
  await page.locator("#style-1-attribute").selectOption("雷神");
  await expect(page.locator("#divine-1")).toHaveText("神意");
  await expectBaselines(page, {
    reason: [3, 5],
    passion: [1, 3],
    life: [1, 3],
    mundane: [2, 5]
  });
});
