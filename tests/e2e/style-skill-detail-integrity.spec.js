import { test, expect } from "@playwright/test";
import { getTestCastId, hasAuthCredentials, waitForEditorReady } from "./helpers.js";

const PREFIX = "@@TNX_STYLE_DETAIL_V1@@";

test("スタイル技能詳細は表示欄と保存用descriptionの双方向同期を維持する", async ({ page }) => {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");

  await page.goto(`/sheet.html?id=${getTestCastId()}`);
  await waitForEditorReady(page);

  const row = page.locator("#style-skills tbody tr[data-skill-key]:not(.style-skill-separator-row)").first();
  await expect(row).toBeVisible();

  const visibleDescription = row.locator('[data-style-field="description"]');
  const visibleTiming = row.locator('[data-style-field="timing"]');
  const original = row.locator('textarea[data-f="description"]');
  await expect(visibleDescription).toHaveCount(1);
  await expect(visibleTiming).toHaveCount(1);
  await expect(original).toHaveCount(1);

  // A normal edit must immediately rebuild the hidden canonical payload used by save/import.
  await visibleDescription.fill("E2E詳細同期確認");
  await expect.poll(async () => {
    const value = await original.inputValue();
    if (!value.startsWith(PREFIX)) return "";
    try {
      return JSON.parse(value.slice(PREFIX.length).trim()).description;
    } catch {
      return "";
    }
  }).toBe("E2E詳細同期確認");

  // Conversely, import/re-render paths can replace the hidden payload directly.
  // The visible structured fields must follow that canonical source without a save/reload.
  await original.evaluate((element, prefix) => {
    element.value = `${prefix}\n${JSON.stringify({
      skill: "",
      limit: "",
      timing: "E2Eタイミング",
      target: "",
      range: "",
      difficulty: "",
      confrontation: "",
      description: "E2E原本同期確認",
      page: ""
    })}`;
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }, PREFIX);

  await expect(visibleTiming).toHaveValue("E2Eタイミング");
  await expect(visibleDescription).toHaveValue("E2E原本同期確認");

  // Give the requestAnimationFrame-based integrity pass time to settle and ensure
  // it does not multiply rows or leave a nested detail payload in the visible field.
  const rowCount = await page.locator("#style-skills tbody tr[data-skill-key]").count();
  await page.waitForTimeout(500);
  await expect(page.locator("#style-skills tbody tr[data-skill-key]")).toHaveCount(rowCount);
  await expect(visibleDescription).not.toContainText(PREFIX);
});

test("スタイル技能の名称・レベル変更はコンボとカウンター候補へ反映される", async ({ page }) => {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");

  await page.goto(`/sheet.html?id=${getTestCastId()}`);
  await waitForEditorReady(page);

  const row = page.locator("#style-skills tbody tr[data-skill-key]:not(.style-skill-separator-row)").first();
  await expect(row).toBeVisible();

  const uniqueName = `E2E候補同期${Date.now()}`;
  const name = row.locator('[data-f="name"]');
  const level = row.locator('[data-f="level"]');
  await expect(name).toHaveCount(1);
  await expect(level).toHaveCount(1);

  await name.fill(uniqueName);
  await level.fill("2");

  await expect(page.locator(`#sheet-combo-skill-options input[data-skill-name="${uniqueName}"]`)).toHaveCount(1);
  await expect(page.locator(`#sheet-counter-skill option[value="${uniqueName}"]`)).toHaveCount(1);

  // Candidate refresh is presentation-only in this test; no save action is performed.
  await page.waitForTimeout(250);
  await expect(page.locator(`#sheet-combo-skill-options input[data-skill-name="${uniqueName}"]`)).toHaveCount(1);
  await expect(page.locator(`#sheet-counter-skill option[value="${uniqueName}"]`)).toHaveCount(1);
});

test("コンボ・カウンター候補の出力DOMが再描画されてもスタイル技能候補を復元する", async ({ page }) => {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");

  await page.goto(`/sheet.html?id=${getTestCastId()}`);
  await waitForEditorReady(page);

  const row = page.locator("#style-skills tbody tr[data-skill-key]:not(.style-skill-separator-row)").first();
  await expect(row).toBeVisible();

  const uniqueName = `E2E再描画候補${Date.now()}`;
  await row.locator('[data-f="name"]').fill(uniqueName);
  await row.locator('[data-f="level"]').fill("3");

  const comboCandidate = page.locator(`#sheet-combo-skill-options input[data-skill-name="${uniqueName}"]`);
  const counterCandidate = page.locator(`#sheet-counter-skill option[value="${uniqueName}"]`);
  await expect(comboCandidate).toHaveCount(1);
  await expect(counterCandidate).toHaveCount(1);

  // Simulate a downstream renderer replacing the presentation-only candidate containers.
  // The output-root observers currently owned by sheet-features.js must repopulate them.
  await page.locator("#sheet-combo-skill-options").evaluate(element => element.replaceChildren());
  await page.locator("#sheet-counter-skill").evaluate(element => element.replaceChildren());

  await expect(comboCandidate).toHaveCount(1);
  await expect(counterCandidate).toHaveCount(1);
});
