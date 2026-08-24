import { test, expect } from "@playwright/test";
import { getTestCastId, hasAuthCredentials, waitForEditorReady } from "./helpers.js";

test("スタイル技能の編集内容は保存・再読込後も候補表示まで維持される", async ({ page }) => {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");

  const url = `/sheet.html?id=${getTestCastId()}`;
  await page.goto(url);
  await waitForEditorReady(page);

  const row = page.locator("#style-skills tbody tr[data-skill-key]:not(.style-skill-separator-row)").first();
  await expect(row).toBeVisible();

  const name = row.locator('[data-f="name"]');
  const level = row.locator('[data-f="level"]');
  const originalName = await name.inputValue();
  const originalLevel = await level.inputValue();
  const uniqueName = `E2E保存再読込${Date.now()}`;

  try {
    await name.fill(uniqueName);
    await level.fill("2");

    await page.locator("#save-button").click();
    await expect(page.locator("#save-status")).toHaveText("保存済み", { timeout: 15000 });

    await page.reload();
    await waitForEditorReady(page);

    const reloadedRow = page.locator("#style-skills tbody tr[data-skill-key]:not(.style-skill-separator-row)").first();
    await expect(reloadedRow.locator('[data-f="name"]')).toHaveValue(uniqueName);
    await expect(reloadedRow.locator('[data-f="level"]')).toHaveValue("2");

    await expect(page.locator(`#sheet-combo-skill-options input[data-skill-name="${uniqueName}"]`)).toHaveCount(1);
    await expect(page.locator(`#sheet-counter-skill option[value="${uniqueName}"]`)).toHaveCount(1);
  } finally {
    await page.goto(url);
    await waitForEditorReady(page);

    const restoreRow = page.locator("#style-skills tbody tr[data-skill-key]:not(.style-skill-separator-row)").first();
    await restoreRow.locator('[data-f="name"]').fill(originalName);
    await restoreRow.locator('[data-f="level"]').fill(originalLevel);
    await page.locator("#save-button").click();
    await expect(page.locator("#save-status")).toHaveText("保存済み", { timeout: 15000 });
  }
});

test("プロフィール・スタイル印・能力値・制御値・CSは保存再読込で維持される", async ({ page }) => {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");

  const url = `/sheet.html?id=${getTestCastId()}`;
  await page.goto(url);
  await waitForEditorReady(page);

  const summary = page.locator("#summary");
  const styleMark = page.locator("#style-1-mark");
  const reasonBase = page.locator("#reason-base");
  const reasonControlBase = page.locator("#reason-control-base");
  const csBase = page.locator("#cs-base");

  const original = {
    summary: await summary.inputValue(),
    styleMark: await styleMark.inputValue(),
    reasonBase: await reasonBase.inputValue(),
    reasonControlBase: await reasonControlBase.inputValue(),
    csBase: await csBase.inputValue()
  };

  const changed = {
    summary: `E2E境界確認${Date.now()}`,
    styleMark: original.styleMark === "◎" ? "●" : "◎",
    reasonBase: String(Number(original.reasonBase || 0) + 1),
    reasonControlBase: String(Number(original.reasonControlBase || 0) + 1),
    csBase: String(Number(original.csBase || 0) + 1)
  };

  try {
    await summary.fill(changed.summary);
    await styleMark.selectOption(changed.styleMark);
    await reasonBase.fill(changed.reasonBase);
    await reasonControlBase.fill(changed.reasonControlBase);
    await csBase.fill(changed.csBase);

    await page.locator("#save-button").click();
    await expect(page.locator("#save-status")).toHaveText("保存済み", { timeout: 15000 });

    await page.reload();
    await waitForEditorReady(page);

    await expect(page.locator("#summary")).toHaveValue(changed.summary);
    await expect(page.locator("#style-1-mark")).toHaveValue(changed.styleMark);
    await expect(page.locator("#reason-base")).toHaveValue(changed.reasonBase);
    await expect(page.locator("#reason-control-base")).toHaveValue(changed.reasonControlBase);
    await expect(page.locator("#cs-base")).toHaveValue(changed.csBase);
  } finally {
    await page.goto(url);
    await waitForEditorReady(page);

    await page.locator("#summary").fill(original.summary);
    await page.locator("#style-1-mark").selectOption(original.styleMark);
    await page.locator("#reason-base").fill(original.reasonBase);
    await page.locator("#reason-control-base").fill(original.reasonControlBase);
    await page.locator("#cs-base").fill(original.csBase);
    await page.locator("#save-button").click();
    await expect(page.locator("#save-status")).toHaveText("保存済み", { timeout: 15000 });
  }
});
