import { test, expect } from "@playwright/test";
import { hasAuthCredentials } from "./helpers.js";

test("iPhone幅で登録キャストカードが間延びしない", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobileプロジェクト専用");
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");

  await page.goto("/account.html");
  await expect(page).not.toHaveURL(/login\.html/);

  const card = page.locator(".owned-cast").first();
  test.skip(await card.count() === 0, "登録キャストがないためスキップ");
  await expect(card).toBeVisible();

  const links = card.locator(".owned-cast__links a");
  await expect(links).toHaveCount(4);
  await expect(card.locator('.owned-cast__links a[href*="#combos"]')).toHaveCount(0);
  await expect(card.locator('[data-mobile-sheet-link="1"]')).toHaveCount(1);

  const layout = await card.evaluate(element => {
    const identity = element.querySelector(".owned-cast__identity");
    const meta = element.querySelector(".owned-cast__meta");
    const links = element.querySelector(".owned-cast__links");
    const rect = element.getBoundingClientRect();
    const style = node => node ? getComputedStyle(node) : null;
    return {
      height: rect.height,
      identityFlex: style(identity)?.flexBasis,
      metaFlex: style(meta)?.flexBasis,
      linkColumns: style(links)?.gridTemplateColumns?.split(" ").filter(Boolean).length || 0
    };
  });

  expect(layout.identityFlex).toBe("auto");
  expect(layout.metaFlex).toBe("auto");
  expect(layout.linkColumns).toBe(2);
  expect(layout.height).toBeLessThan(420);
});
