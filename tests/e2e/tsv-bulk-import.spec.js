import { test, expect } from "./safe-test.js";
import { getTestCastId, hasAuthCredentials, waitForEditorReady } from "./helpers.js";

const STYLE_HEADERS = ["名称", "種別", "レベル", "技能", "上限", "タイミング", "対象", "射程", "目標値", "対決", "解説", "参照P"];
const OUTFIT_HEADERS = [
  "分類", "名称", "購入", "常備化", "隠匿値", "隠匿修正", "攻撃", "受", "射程", "ス", "電制",
  "S", "P", "I", "制御値", "CS修正", "表層", "深層", "無", "ソ", "サ", "ハ", "乗員", "SF", "登", "電", "ア",
  "部位", "メーカー", "参照P", "OFC大分類", "OFC小分類", "解説"
];

function row(headers, values) {
  return headers.map(header => values[header] ?? "").join("\t");
}

async function openEditor(page) {
  test.skip(!hasAuthCredentials(), "requires authenticated editor credentials");
  await page.goto(`/sheet.html?id=${getTestCastId()}`, { waitUntil: "domcontentloaded" });
  await waitForEditorReady(page);
  await expect(page.locator("#import-style-tsv")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("#import-outfit-tsv")).toBeVisible({ timeout: 15_000 });
}

test.beforeEach(async ({ page }) => {
  await openEditor(page);
});

test("style TSV paste previews and appends a structured row without saving", async ({ page }) => {
  const savedEvents = await page.evaluate(() => {
    window.__tsvSavedEvents = 0;
    window.addEventListener("tnx:character-saved", () => { window.__tsvSavedEvents += 1; });
    return window.__tsvSavedEvents;
  });
  expect(savedEvents).toBe(0);

  const existing = page.locator("#style-skills [data-skill-key]");
  const beforeKeys = await existing.evaluateAll(rows => [...new Set(rows.map(row => row.dataset.skillKey).filter(Boolean))]);
  await page.locator("#import-style-tsv").click();

  const values = {
    "名称": "TSV取込テスト",
    "種別": "秘技",
    "レベル": "2",
    "技能": "白兵",
    "上限": "4",
    "タイミング": "メジャー",
    "対象": "単体",
    "射程": "武器",
    "目標値": "制御値",
    "対決": "回避",
    "解説": "TSVから追加した解説",
    "参照P": "999"
  };
  const tsv = `${STYLE_HEADERS.join("\t")}\r\n${row(STYLE_HEADERS, values)}\r\n`;
  const dialog = page.locator("#tsv-dialog");
  await dialog.locator("#tsv-input").fill(tsv);
  await expect(dialog.locator("#tsv-preview tbody tr")).toHaveCount(1);
  await expect(dialog.locator("#tsv-apply")).toBeEnabled();
  await dialog.locator("#tsv-apply").click();
  await expect(dialog).not.toBeVisible();

  await expect.poll(async () => existing.evaluateAll((rows, keys) => {
    const current = [...new Set(rows.map(row => row.dataset.skillKey).filter(Boolean))];
    return current.filter(key => !keys.includes(key)).length;
  }, beforeKeys)).toBe(1);
  const newKey = await existing.evaluateAll((rows, keys) => {
    const current = [...new Set(rows.map(row => row.dataset.skillKey).filter(Boolean))];
    return current.find(key => !keys.includes(key));
  }, beforeKeys);
  const added = page.locator(`#style-skills [data-skill-key="${newKey}"]`).first();
  await expect(added).toHaveAttribute("data-full-style-fields", "1");
  await expect(added.locator("[data-f='name']")).toHaveValue(values["名称"]);
  await expect(added.locator("[data-f='level']")).toHaveValue(values["レベル"]);
  await expect(added.locator("[data-style-field='skill']")).toHaveValue(values["技能"]);
  await expect(added.locator("[data-style-field='description']")).toHaveValue(values["解説"]);
  await expect(added.locator("[data-style-field='page']")).toHaveValue(values["参照P"]);
  expect(await page.evaluate(() => window.__tsvSavedEvents)).toBe(0);
});

test("headerless TSV uses template column order and template action is in the upper-right header", async ({ page }) => {
  await page.locator("#import-style-tsv").click();
  const dialog = page.locator("#tsv-dialog");
  const templateButton = dialog.locator("header #tsv-template");
  await expect(templateButton).toBeVisible();

  const titleBox = await dialog.locator("#tsv-title").boundingBox();
  const templateBox = await templateButton.boundingBox();
  expect(titleBox).not.toBeNull();
  expect(templateBox).not.toBeNull();
  expect(templateBox.x).toBeGreaterThan(titleBox.x);

  const values = {
    "名称": "見出しなし技能",
    "種別": "一般",
    "レベル": "3",
    "技能": "射撃",
    "上限": "5",
    "タイミング": "メジャー",
    "対象": "単体",
    "射程": "武器",
    "目標値": "制御値",
    "対決": "回避",
    "解説": "見出し行なしで取り込む",
    "参照P": "123"
  };
  await dialog.locator("#tsv-input").fill(`${row(STYLE_HEADERS, values)}\r\n`);
  await expect(dialog.locator("#tsv-error")).toBeHidden();
  await expect(dialog.locator("#tsv-preview tbody tr")).toHaveCount(1);
  await expect(dialog.locator("#tsv-preview tbody tr td").first()).toHaveText(values["名称"]);
  await expect(dialog.locator("#tsv-preview tbody tr td").nth(3)).toHaveText(values["技能"]);
  await expect(dialog.locator("#tsv-apply")).toBeEnabled();
});

test("malformed header-like first row is still rejected instead of being treated as data", async ({ page }) => {
  await page.locator("#import-style-tsv").click();
  const dialog = page.locator("#tsv-dialog");
  const malformedHeaders = [...STYLE_HEADERS];
  malformedHeaders[1] = "種別X";
  const values = Object.fromEntries(STYLE_HEADERS.map(header => [header, ""]));
  values["名称"] = "テスト";
  values["レベル"] = "1";
  await dialog.locator("#tsv-input").fill(`${malformedHeaders.join("\t")}\r\n${row(STYLE_HEADERS, values)}\r\n`);
  await expect(dialog.locator("#tsv-error")).toContainText("不足している見出し");
  await expect(dialog.locator("#tsv-error")).toContainText("未対応の見出し");
  await expect(dialog.locator("#tsv-apply")).toBeDisabled();
});

test("TSV validation accepts quoted multiline description and rejects multiline non-text field", async ({ page }) => {
  await page.locator("#import-style-tsv").click();
  const dialog = page.locator("#tsv-dialog");

  const accepted = `${STYLE_HEADERS.join("\t")}\r\n"複数\r\n行の名称"\t一般\t1\t白兵\t4\tメジャー\t単体\t武器\t制御値\t回避\t"一行目\r\n二行目"\t999\r\n`;
  await dialog.locator("#tsv-input").fill(accepted);
  await expect(dialog.locator("#tsv-error")).toBeHidden();
  await expect(dialog.locator("#tsv-preview tbody tr")).toHaveCount(1);
  await expect(dialog.locator("#tsv-preview tbody tr td").first()).toContainText("複数\n行の名称");
  await expect(dialog.locator("#tsv-apply")).toBeEnabled();

  const rejected = `${STYLE_HEADERS.join("\t")}\r\nテスト\t一般\t1\t"白兵\r\n射撃"\t4\tメジャー\t単体\t武器\t制御値\t回避\t解説\t999\r\n`;
  await dialog.locator("#tsv-input").fill(rejected);
  await expect(dialog.locator("#tsv-error")).toContainText("セル内改行は名称・解説のみ");
  await expect(dialog.locator("#tsv-apply")).toBeDisabled();
});

test("outfit TSV file import appends current editor fields and keeps existing rows", async ({ page }) => {
  const existingRows = page.locator("#outfit-list [data-outfit-key]");
  const beforeKeys = await existingRows.evaluateAll(rows => [...new Set(rows.map(row => row.dataset.outfitKey).filter(Boolean))]);
  await page.locator("#import-outfit-tsv").click();

  const values = {
    "分類": "武器",
    "名称": "TSVウェポン",
    "購入": "12",
    "常備化": "3",
    "隠匿値": "10",
    "隠匿修正": "0",
    "攻撃": "P+7",
    "受": "2",
    "射程": "近",
    "ス": "1",
    "電制": "15",
    "部位": "片手持ち",
    "メーカー": "TEST",
    "参照P": "999",
    "OFC大分類": "武器",
    "OFC小分類": "白兵武器",
    "解説": "ファイル経由のTSV取込"
  };
  const tsv = `\uFEFF${OUTFIT_HEADERS.join("\t")}\r\n${row(OUTFIT_HEADERS, values)}\r\n`;
  const fileInput = page.locator("#tsv-dialog #tsv-file");
  await fileInput.setInputFiles({ name: "outfit.tsv", mimeType: "text/tab-separated-values", buffer: Buffer.from(tsv, "utf8") });
  await expect(page.locator("#tsv-preview tbody tr")).toHaveCount(1);
  await page.locator("#tsv-apply").click();
  await expect(page.locator("#tsv-dialog")).not.toBeVisible();

  await expect.poll(async () => page.locator("#outfit-list [data-outfit-key]").evaluateAll((rows, keys) => {
    const current = [...new Set(rows.map(row => row.dataset.outfitKey).filter(Boolean))];
    return current.filter(key => !keys.includes(key)).length;
  }, beforeKeys)).toBe(1);

  const newKey = await page.locator("#outfit-list [data-outfit-key]").evaluateAll((rows, keys) => {
    const current = [...new Set(rows.map(row => row.dataset.outfitKey).filter(Boolean))];
    return current.find(key => !keys.includes(key));
  }, beforeKeys);
  const added = page.locator(`#outfit-list [data-outfit-key="${newKey}"]`).first();
  await expect(added.locator("[data-o='name']")).toHaveValue(values["名称"]);
  await expect(added.locator("[data-o='purchase_value']")).toHaveValue(values["購入"]);
  await expect(added.locator("[data-o='concealment']")).toHaveValue(values["隠匿値"]);
  await expect(added.locator("[data-o='attack']")).toHaveValue(values["攻撃"]);
  await expect(added.locator("[data-o='manufacturer']")).toHaveValue(values["メーカー"]);
  await expect(added.locator("[data-o='description']")).toHaveValue(values["解説"]);

  const currentKeys = await page.locator("#outfit-list [data-outfit-key]").evaluateAll(rows => [...new Set(rows.map(row => row.dataset.outfitKey).filter(Boolean))]);
  for (const key of beforeKeys) expect(currentKeys).toContain(key);
});

test("headerless outfit TSV is accepted in template order", async ({ page }) => {
  await page.locator("#import-outfit-tsv").click();
  const dialog = page.locator("#tsv-dialog");
  const values = {
    "分類": "防具",
    "名称": "見出しなし防具",
    "購入": "8",
    "常備化": "2",
    "隠匿値": "12",
    "隠匿修正": "0",
    "S": "2",
    "P": "3",
    "I": "1",
    "解説": "見出しなしアウトフィット"
  };
  await dialog.locator("#tsv-input").fill(`${row(OUTFIT_HEADERS, values)}\r\n`);
  await expect(dialog.locator("#tsv-error")).toBeHidden();
  await expect(dialog.locator("#tsv-preview tbody tr")).toHaveCount(1);
  await expect(dialog.locator("#tsv-preview tbody tr td").nth(1)).toHaveText(values["名称"]);
  await expect(dialog.locator("#tsv-apply")).toBeEnabled();
});
