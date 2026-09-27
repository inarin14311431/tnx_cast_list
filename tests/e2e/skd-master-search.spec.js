import { test, expect } from "./safe-test.js";
import { getTestCastId, hasAuthCredentials, waitForEditorReady } from "./helpers.js";

const DETAIL_FIELDS = ["skill", "limit", "timing", "target", "range", "difficulty", "confrontation", "description", "page"];

function normalizeDisplayValue(value) {
  const text = String(value ?? "").trim();
  return text === "—" ? "" : text;
}

test.beforeEach(async ({ page }) => {
  test.skip(!hasAuthCredentials(), "requires authenticated editor credentials");
  await page.goto(`/sheet.html?id=${getTestCastId()}`, { waitUntil: "domcontentloaded" });
  await waitForEditorReady(page);
});

test("SKD search adds a fully prepared structured style-skill row", async ({ page }) => {
  const openButton = page.locator("#search-skd-master");
  await expect(openButton).toBeVisible({ timeout: 15_000 });
  await openButton.click();

  const dialog = page.locator("#master-search-dialog");
  await expect(dialog).toBeVisible();
  const firstResult = dialog.locator(".master-result-card").first();
  await expect(firstResult).toBeVisible({ timeout: 15_000 });

  const expected = await firstResult.evaluate(card => {
    const chips = {};
    card.querySelectorAll(".master-result-chips span").forEach(element => {
      const match = String(element.textContent || "").match(/^([^：]+)：(.*)$/);
      if (match) chips[match[1]] = match[2].trim();
    });
    const metaParts = String(card.querySelector(".master-result-meta")?.textContent || "").split(" / ");
    const pagePart = metaParts.at(-1) || "";
    const descriptionText = String(card.querySelector("details p")?.textContent || "").trim();
    return {
      name: String(card.querySelector("h3")?.textContent || "").trim(),
      skill: chips["技能"] || "",
      limit: chips["上限"] || "",
      timing: chips["タイミング"] || "",
      target: chips["対象"] || "",
      range: chips["射程"] || "",
      difficulty: chips["目標値"] || "",
      confrontation: chips["対決"] || "",
      description: descriptionText === "解説なし" ? "" : descriptionText,
      page: pagePart.replace(/^P\./, "").trim()
    };
  });
  expected.page = normalizeDisplayValue(expected.page);

  const rows = page.locator("#style-skills tr[data-skill-key]");
  const beforeKeys = await rows.evaluateAll(elements => elements.map(element => element.dataset.skillKey));
  await firstResult.locator("[data-result-add]").click();
  await expect(dialog.locator("#master-search-status")).toContainText("追加しました", { timeout: 5_000 });

  await expect.poll(async () => rows.evaluateAll((elements, keys) =>
    elements.findIndex(element => !keys.includes(element.dataset.skillKey)), beforeKeys
  )).toBeGreaterThan(-1);

  const newRowIndex = await rows.evaluateAll((elements, keys) =>
    elements.findIndex(element => !keys.includes(element.dataset.skillKey)), beforeKeys
  );
  const row = rows.nth(newRowIndex);

  await expect(row).toHaveAttribute("data-full-style-fields", "1");
  await expect(row.locator("[data-style-field]")).toHaveCount(DETAIL_FIELDS.length);
  await expect(row.locator("[data-f='name']")).toHaveValue(expected.name);

  for (const field of DETAIL_FIELDS) {
    await expect(row.locator(`[data-style-field="${field}"]`)).toHaveValue(expected[field]);
  }

  const canonical = await row.locator('textarea[data-f="description"]').inputValue();
  expect(canonical).toMatch(/^@@TNX_STYLE_DETAIL_V1@@\n/);
  const stored = JSON.parse(canonical.split("\n").slice(1).join("\n"));
  for (const field of DETAIL_FIELDS) expect(String(stored[field] ?? "")).toBe(expected[field]);
});
