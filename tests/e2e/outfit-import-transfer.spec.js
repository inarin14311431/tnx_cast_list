import { test, expect } from "@playwright/test";
import { getTestCastId, hasAuthCredentials, waitForEditorReady } from "./helpers.js";

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name === "mobile", "PC編集画面のアウトフィット取込E2Eはdesktopで検証");
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");
}

async function openEditor(page) {
  await page.goto(`/sheet.html?id=${getTestCastId()}`);
  await waitForEditorReady(page);
}

function outfitRowByName(page, name) {
  return page.locator("#outfit-list [data-outfit-key]").filter({ has: page.getByDisplayValue(name) });
}

test("OFC TSV取込は隠匿値と隠匿修正を分離し、構造化項目を正しい欄へ転記する", async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await openEditor(page);

  const name = `E2E-TSV-${Date.now()}`;
  const tsv = [
    ["target","name","purchase","permanent","concealA","concealB","attack","defense","range","part","notes","electronic_control","speed","cs_modifier","crew","sf"].join("\t"),
    ["vehicles",name,"12","3","13","-2","P+5","S 4 / P 5 / I 6","","ヴィークル","E2E TSV TRANSFER","18","2","1","4","2"].join("\t")
  ].join("\n");

  await page.locator("#import-ofc").click();
  await expect(page.locator("#tsv-dialog")).toBeVisible();
  await page.locator("#tsv-text").fill(tsv);
  await page.locator("#tsv-apply").click();

  const row = outfitRowByName(page, name);
  await expect(row).toHaveCount(1, { timeout: 10000 });
  await expect(row.locator('[data-o="concealment"]')).toHaveValue("13");
  await expect(row.locator('[data-ofc="concealment_penalty"]')).toHaveValue("-2");
  await expect(row.locator('[data-o="attack"]')).toHaveValue("P+5");
  await expect(row.locator('[data-o="cs_modifier"]')).toHaveValue("1");
  await expect(row.locator('[data-ofc="electronic_control"]')).toHaveValue("18");
  await expect(row.locator('[data-ofc="speed"]')).toHaveValue("2");
  await expect(row.locator('[data-ofc="defense_s"]')).toHaveValue("4");
  await expect(row.locator('[data-ofc="defense_p"]')).toHaveValue("5");
  await expect(row.locator('[data-ofc="defense_i"]')).toHaveValue("6");
  await expect(row.locator('[data-ofc="crew"]')).toHaveValue("4");
  await expect(row.locator('[data-ofc="sf"]')).toHaveValue("2");
  await expect(row.locator('[data-o="description"]')).toHaveValue("E2E TSV TRANSFER");
});

test("旧JSON取込は12/0形式を隠匿値と隠匿修正へ分離して表示する", async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await openEditor(page);

  const name = `E2E-LEGACY-${Date.now()}`;
  const payload = {
    weapons: [{
      name,
      purchase: "8",
      permanent: "2",
      concealA: "12",
      concealB: "-1",
      attack: "P+4",
      range: "近",
      slot: "片手持ち",
      notes: "E2E LEGACY IMPORT"
    }]
  };

  await page.locator("#legacy-import-open").click();
  await expect(page.locator("#legacy-import-dialog")).toBeVisible();
  await page.locator("#legacy-import-json").fill(JSON.stringify(payload));
  await page.locator("#legacy-import-apply").click();

  await expect(page.locator("#legacy-import-message")).toContainText("取込が完了", { timeout: 20000 });
  const row = outfitRowByName(page, name);
  await expect(row).toHaveCount(1, { timeout: 10000 });
  await expect(row.locator('[data-o="concealment"]')).toHaveValue("12");
  await expect(row.locator('[data-ofc="concealment_penalty"]')).toHaveValue("-1");
  await expect(row.locator('[data-o="attack"]')).toHaveValue("P+4");
  await expect(row.locator('[data-o="range"]')).toHaveValue("近");
  await expect(row.locator('[data-o="description"]')).toHaveValue("E2E LEGACY IMPORT");
});

test("OFCマスター直接追加は隠匿を分離し、解説へ補助項目を混入させない", async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await openEditor(page);

  const searchButton = page.locator("#search-ofc-master");
  await expect(searchButton).toBeVisible({ timeout: 10000 });
  await searchButton.click();
  await expect(page.locator("#master-search-dialog")).toBeVisible();

  const keyword = page.locator("#master-search-keyword");
  await keyword.fill("ガーディアン");
  await page.locator("#master-search-run").click();
  const result = page.locator("#master-search-results .master-result-card").filter({ hasText: "ガーディアン" }).first();
  await expect(result).toBeVisible({ timeout: 10000 });
  await result.locator("[data-result-add]").click();

  const row = outfitRowByName(page, "ガーディアン").last();
  await expect(row).toBeVisible({ timeout: 10000 });
  await expect(row.locator('[data-o="concealment"]')).toHaveValue("9");
  await expect(row.locator('[data-ofc="concealment_penalty"]')).toHaveValue("-1");
  await expect(row.locator('[data-ofc="electronic_control"]')).toHaveValue("16");
  await expect(row.locator('[data-o="description"]')).not.toHaveValue(/メーカー：|制御値：|電制：|参照P：/);
});

test("アウトフィット追加と並べ替え後も複数行フィールド変換と値を保持する", async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await openEditor(page);

  const suffix = Date.now();
  const firstName = `E2E-ORDER-A-${suffix}`;
  const secondName = `E2E-ORDER-B-${suffix}`;

  await page.locator('[data-add-outfit-category="weapon"]').click();
  let weaponRows = page.locator('#outfit-list .outfit-table-group--weapon .outfit-table-row');
  let first = weaponRows.last();
  const firstNameField = first.locator('[data-o="name"]');
  await expect(firstNameField).toHaveJSProperty("tagName", "TEXTAREA", { timeout: 10000 });
  await firstNameField.fill(firstName);
  await first.locator('[data-o="description"]').fill("FIRST DESCRIPTION");

  await page.locator('[data-add-outfit-category="weapon"]').click();
  weaponRows = page.locator('#outfit-list .outfit-table-group--weapon .outfit-table-row');
  let second = weaponRows.last();
  const secondNameField = second.locator('[data-o="name"]');
  await expect(secondNameField).toHaveJSProperty("tagName", "TEXTAREA", { timeout: 10000 });
  await secondNameField.fill(secondName);
  await second.locator('[data-o="description"]').fill("SECOND DESCRIPTION");

  second = outfitRowByName(page, secondName);
  await second.locator('[data-outfit-move="up"]').click();

  const movedFirst = outfitRowByName(page, firstName);
  const movedSecond = outfitRowByName(page, secondName);
  await expect(movedFirst).toHaveCount(1, { timeout: 10000 });
  await expect(movedSecond).toHaveCount(1, { timeout: 10000 });
  await expect(movedFirst.locator('[data-o="name"]')).toHaveJSProperty("tagName", "TEXTAREA");
  await expect(movedSecond.locator('[data-o="name"]')).toHaveJSProperty("tagName", "TEXTAREA");
  await expect(movedFirst.locator('[data-o="description"]')).toHaveValue("FIRST DESCRIPTION");
  await expect(movedSecond.locator('[data-o="description"]')).toHaveValue("SECOND DESCRIPTION");
});

test("防具S P Iは正式フィールドで編集し、合計と並べ替え後の値を維持する", async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await openEditor(page);

  const suffix = Date.now();
  const firstName = `E2E-ARMOR-A-${suffix}`;
  const secondName = `E2E-ARMOR-B-${suffix}`;

  await page.locator('[data-add-outfit-category="armor"]').click();
  let armorRows = page.locator('#outfit-list .outfit-table-group--armor .outfit-table-row');
  let first = armorRows.last();
  await first.locator('[data-o="name"]').fill(firstName);
  await expect(first.locator('[data-ofc="defense_s"]')).toBeVisible({ timeout: 10000 });
  await first.locator('[data-ofc="defense_s"]').fill("2");
  await first.locator('[data-ofc="defense_p"]').fill("3");
  await first.locator('[data-ofc="defense_i"]').fill("4");

  await page.locator('[data-add-outfit-category="armor"]').click();
  armorRows = page.locator('#outfit-list .outfit-table-group--armor .outfit-table-row');
  let second = armorRows.last();
  await second.locator('[data-o="name"]').fill(secondName);
  await expect(second.locator('[data-ofc="defense_s"]')).toBeVisible({ timeout: 10000 });
  await second.locator('[data-ofc="defense_s"]').fill("5");
  await second.locator('[data-ofc="defense_p"]').fill("6");
  await second.locator('[data-ofc="defense_i"]').fill("7");

  const armorGroup = page.locator('#outfit-list .outfit-table-group--armor');
  await expect(armorGroup.locator('[data-armor-total="s"]')).toHaveText("7");
  await expect(armorGroup.locator('[data-armor-total="p"]')).toHaveText("9");
  await expect(armorGroup.locator('[data-armor-total="i"]')).toHaveText("11");
  await expect(armorGroup.locator('[data-armor-defense]')).toHaveCount(0);

  second = outfitRowByName(page, secondName);
  await second.locator('[data-outfit-move="up"]').click();

  const movedFirst = outfitRowByName(page, firstName);
  const movedSecond = outfitRowByName(page, secondName);
  await expect(movedFirst.locator('[data-ofc="defense_s"]')).toHaveValue("2", { timeout: 10000 });
  await expect(movedFirst.locator('[data-ofc="defense_p"]')).toHaveValue("3");
  await expect(movedFirst.locator('[data-ofc="defense_i"]')).toHaveValue("4");
  await expect(movedSecond.locator('[data-ofc="defense_s"]')).toHaveValue("5");
  await expect(movedSecond.locator('[data-ofc="defense_p"]')).toHaveValue("6");
  await expect(movedSecond.locator('[data-ofc="defense_i"]')).toHaveValue("7");
});
