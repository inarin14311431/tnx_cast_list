import { test, expect } from "@playwright/test";
import { getTestCastId, hasAuthCredentials, waitForEditorReady } from "./helpers.js";

async function openEditor(page) {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");
  await page.goto(`/sheet.html?id=${getTestCastId()}`);
  await waitForEditorReady(page);
}

test("技能とアウトフィットの新規行は追加・編集・削除までブラウザ上で維持される", async ({ page }) => {
  await openEditor(page);

  const styleRows = page.locator("#style-skills tbody tr[data-skill-key]:not(.style-skill-separator-row)");
  const styleBefore = await styleRows.count();
  await page.locator("#add-style-skill").click();
  await expect(styleRows).toHaveCount(styleBefore + 1);

  const styleName = `E2E-STYLE-${Date.now()}`;
  const addedStyle = styleRows.last();
  await expect(addedStyle.locator('[data-f="level"]')).toHaveValue("1");
  await expect(addedStyle.locator('[data-f="skill_kind"]')).toHaveValue("normal");
  await addedStyle.locator('[data-f="name"]').fill(styleName);
  await expect(addedStyle.locator('[data-f="name"]')).toHaveValue(styleName);
  await addedStyle.locator("[data-delete-skill]").click();
  await expect(styleRows).toHaveCount(styleBefore);

  const generalRows = page.locator("#general-skills tbody tr[data-skill-key]");
  const generalBefore = await generalRows.count();
  await page.locator("#add-general").click();
  await expect(generalRows).toHaveCount(generalBefore + 1);

  const generalName = `E2E-GENERAL-${Date.now()}`;
  const addedGeneral = generalRows.last();
  await expect(addedGeneral.locator('[data-f="level"]')).toHaveValue("0");
  await expect(addedGeneral.locator('[data-f="skill_kind"]')).toHaveValue("proper");
  await addedGeneral.locator('[data-f="name"]').fill(generalName);
  await expect(page.locator("#general-skills tr[data-skill-key]").filter({ has: page.getByDisplayValue(generalName) })).toHaveCount(1);
  await page.locator("#general-skills tr[data-skill-key]").filter({ has: page.getByDisplayValue(generalName) }).locator("[data-delete-skill]").click();
  await expect(generalRows).toHaveCount(generalBefore);

  const outfitRows = page.locator("#outfit-list [data-outfit-key]");
  const outfitBefore = await outfitRows.count();
  await page.locator('[data-add-outfit-category="other"]').click();
  await expect(outfitRows).toHaveCount(outfitBefore + 1, { timeout: 10000 });

  const outfitName = `E2E-OUTFIT-${Date.now()}`;
  const newOtherRow = page.locator("#outfit-list .outfit-table-group--other .outfit-table-row").last();
  await expect(newOtherRow.locator('[data-o="category"]')).toHaveValue("other");
  await newOtherRow.locator('[data-o="name"]').fill(outfitName);

  let namedOutfit = page.locator("#outfit-list [data-outfit-key]").filter({ has: page.getByDisplayValue(outfitName) });
  await expect(namedOutfit).toHaveCount(1);
  await namedOutfit.locator('[data-o="category"]').selectOption("armor");

  namedOutfit = page.locator("#outfit-list [data-outfit-key]").filter({ has: page.getByDisplayValue(outfitName) });
  await expect(namedOutfit).toHaveCount(1, { timeout: 10000 });
  await expect(namedOutfit.locator('[data-o="category"]')).toHaveValue("armor");
  await expect(namedOutfit.locator('[data-o="control_modifier"]')).toBeVisible();
  await expect(namedOutfit.locator('[data-o="concealment"]')).toBeVisible();
  await namedOutfit.locator("[data-delete-outfit]").click();
  await expect(outfitRows).toHaveCount(outfitBefore);
});

test("SKD TSV取込は名称・種別・LV・解説を現在のスタイル技能行へ変換する", async ({ page }) => {
  await openEditor(page);

  const name = `E2E-SKD-${Date.now()}`;
  const tsv = [
    ["名称", "種別", "レベル", "解説"].join("\t"),
    [name, "秘技", "2", "1行目\\n2行目"].join("\t")
  ].join("\n");

  await page.locator("#import-skd").click();
  await expect(page.locator("#tsv-dialog")).toBeVisible();
  await expect(page.locator("#tsv-title")).toContainText("SKD");
  await page.locator("#tsv-text").fill(tsv);
  await page.locator("#tsv-apply").click();

  const row = page.locator("#style-skills tr[data-skill-key]").filter({ has: page.getByDisplayValue(name) });
  await expect(row).toHaveCount(1, { timeout: 10000 });
  await expect(row.locator('[data-f="skill_kind"]')).toHaveValue("secret");
  await expect(row.locator('[data-f="level"]')).toHaveValue("2");
  await expect(row.locator('[data-f="description"]')).toHaveValue("1行目\n2行目");

  await row.locator("[data-delete-skill]").click();
  await expect(page.locator("#style-skills tr[data-skill-key]").filter({ has: page.getByDisplayValue(name) })).toHaveCount(0);
});

test("スタイル・能力値の静的描画と既存のスタイル変更ハンドラが維持される", async ({ page }) => {
  await openEditor(page);

  await expect(page.locator("#style-grid .style-card")).toHaveCount(3);
  for (let i = 1; i <= 3; i++) {
    await expect(page.locator(`#style-${i}`)).toBeVisible();
    await expect(page.locator(`#style-${i}-mark`)).toBeVisible();
    await expect(page.locator(`#divine-${i}`)).toBeVisible();
  }

  for (const key of ["reason", "passion", "life", "mundane"]) {
    await expect(page.locator(`#${key}-base`)).toBeVisible();
    await expect(page.locator(`#${key}-control-base`)).toBeVisible();
    await expect(page.locator(`#${key}-final`)).toBeVisible();
    await expect(page.locator(`#${key}-control-final`)).toBeVisible();
  }
  await expect(page.locator("#cs-base")).toBeVisible();
  await expect(page.locator("#cs-mod")).toBeVisible();
  await expect(page.locator("#cs-final")).toBeVisible();

  await page.locator("#style-1").selectOption({ label: "ウツワ" });
  await expect(page.locator("#style-1-attribute-wrap")).toBeVisible();
  await expect(page.locator("#divine-1")).not.toHaveText("未選択");
});
