import { test, expect } from "@playwright/test";
import { getTestCastId, hasAuthCredentials, waitForEditorReady } from "./helpers.js";

async function openEditor(page) {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");
  await page.goto(`/sheet.html?id=${getTestCastId()}`);
  await waitForEditorReady(page);
}

const CASES = {
  reason: { base: 3, mod: 2, controlBase: 4, controlMod: -1, final: 5, controlFinal: 3 },
  passion: { base: 1, mod: -2, controlBase: 5, controlMod: 3, final: -1, controlFinal: 8 },
  life: { base: 0, mod: 4, controlBase: 0, controlMod: 0, final: 4, controlFinal: 0 },
  mundane: { base: 7, mod: -3, controlBase: 2, controlMod: 2, final: 4, controlFinal: 4 }
};

test("能力値・制御値・CSは現在値と正負の補正値から最終値を再計算する", async ({ page }) => {
  await openEditor(page);

  for (const [key, values] of Object.entries(CASES)) {
    await page.locator(`#${key}-base`).fill(String(values.base));
    await page.locator(`#${key}-mod`).fill(String(values.mod));
    await page.locator(`#${key}-control-base`).fill(String(values.controlBase));
    await page.locator(`#${key}-control-mod`).fill(String(values.controlMod));
  }
  await page.locator("#cs-base").fill("9");
  await page.locator("#cs-mod").fill("-2");

  for (const [key, values] of Object.entries(CASES)) {
    await expect(page.locator(`#${key}-final`)).toHaveText(String(values.final));
    await expect(page.locator(`#${key}-control-final`)).toHaveText(String(values.controlFinal));
  }
  await expect(page.locator("#cs-final")).toHaveText("7");
});
