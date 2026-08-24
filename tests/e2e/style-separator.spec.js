import { test, expect } from "@playwright/test";
import { getTestCastId, hasAuthCredentials, waitForEditorReady } from "./helpers.js";

test("スタイル技能の区切りと改行名称が上下移動後も維持される", async ({ page }) => {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");

  await page.goto(`/sheet.html?id=${getTestCastId()}`);
  await waitForEditorReady(page);

  const rows = page.locator("#style-skills tbody tr[data-skill-key]");
  const separators = page.locator("#style-skills tbody tr.style-skill-separator-row[data-skill-key]");
  const beforeRows = await rows.count();
  const beforeSeparators = await separators.count();

  // First verify a normal style-skill name keeps an intentional newline when any style row is moved.
  const normal = page.locator("#style-skills tbody tr[data-skill-key]:not(.style-skill-separator-row)").first();
  const normalKey = await normal.getAttribute("data-skill-key");
  const normalName = normal.locator('textarea[data-f="name"]');
  if (normalKey && await normalName.count()) {
    await normalName.fill("E2E改行名称\n維持確認");
    const down = normal.locator('[data-skill-move="down"]');
    if (await down.isEnabled()) await down.click();
    else {
      const up = normal.locator('[data-skill-move="up"]');
      if (await up.isEnabled()) await up.click();
    }
    const movedNormal = page.locator(`#style-skills tbody tr[data-skill-key="${normalKey}"] textarea[data-f="name"]`);
    await expect(movedNormal).toHaveValue("E2E改行名称\n維持確認");
  }

  await page.locator("#add-style-separator").click();
  await expect(rows).toHaveCount(beforeRows + 1);
  await expect(separators).toHaveCount(beforeSeparators + 1);

  const divider = separators.last();
  const key = await divider.getAttribute("data-skill-key");
  expect(key).toBeTruthy();
  const dividerName = divider.locator('[data-f="name"]');
  await expect(dividerName).toBeVisible();
  await dividerName.fill("E2E区切り\n改行維持");
  await expect(divider.locator('[data-skill-move="up"]')).toHaveCount(1);
  await expect(divider.locator('[data-skill-move="down"]')).toHaveCount(1);
  await expect(divider.locator('[data-delete-skill]')).toHaveCount(1);

  // Divider owns a dedicated two-cell DOM: title field + native action cell.
  await expect.poll(async () => divider.locator(":scope > td").count()).toBe(2);
  await expect(divider.locator(":scope > td").first()).toHaveClass(/style-separator-main/);
  await expect(divider.locator(":scope > td").last()).toHaveClass(/style-separator-actions/);

  // Reordering calls renderSkills(). The divider must never be expanded to the normal
  // 17-column style-skill structure and its exact multiline name must survive.
  await divider.locator('[data-skill-move="up"]').click();
  const moved = page.locator(`#style-skills tbody tr[data-skill-key="${key}"]`);
  await expect(moved).toHaveClass(/style-skill-separator-row/);
  await expect.poll(async () => moved.locator(":scope > td").count()).toBe(2);
  await expect(moved.locator(":scope > td").first()).toHaveClass(/style-separator-main/);
  await expect(moved.locator(":scope > td").last()).toHaveClass(/style-separator-actions/);
  await expect(moved.locator('textarea[data-f="name"]')).toHaveValue("E2E区切り\n改行維持");
  await expect.poll(async () => {
    const rowBox = await moved.boundingBox();
    const tableBox = await page.locator("#style-skills .style-skill-full-table").boundingBox();
    if (!rowBox || !tableBox) return 999;
    return Math.abs(rowBox.width - tableBox.width);
  }).toBeLessThan(4);

  const moveDown = moved.locator('[data-skill-move="down"]');
  if (await moveDown.isEnabled()) await moveDown.click();
  const movedAgain = page.locator(`#style-skills tbody tr[data-skill-key="${key}"]`);
  await expect.poll(async () => movedAgain.locator(":scope > td").count()).toBe(2);
  await expect(movedAgain.locator('textarea[data-f="name"]')).toHaveValue("E2E区切り\n改行維持");

  // Catch observer loops / accidental cell multiplication after conversion settles.
  await page.waitForTimeout(750);
  await expect(rows).toHaveCount(beforeRows + 1);
  await expect(separators).toHaveCount(beforeSeparators + 1);
  await expect(movedAgain.locator(":scope > td")).toHaveCount(2);
});
