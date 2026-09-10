import { test, expect } from "@playwright/test";

const showcase = {
  version: 2,
  pageTitle: "E2E ACT SHOWCASE",
  heroTitle: "TOKYO N◎VA THE AXLERATION",
  heroSubTitle: "REDUCED MOTION CONTRACT",
  actName: "E2E REDUCED MOTION",
  rulerName: "E2E RULER",
  background: "",
  trailer: {
    title: "ACT TRAILER",
    body: "低モーション設定でも、豪華版の情報シーケンス自体は維持する。"
  },
  casts: [
    {
      slot: "CAST 01",
      serial: "E2E-REDUCED-01",
      fullName: "E2E テスト・キャスト",
      reading: "テスト キャスト",
      tagline: "reduced-motion回帰テスト",
      imageUrl: "",
      imageAlt: "E2Eテストキャスト",
      styles: [{ label: "カブト◎", handoutRole: true }],
      meta: [],
      handout: {
        title: "『カブト』用ハンドアウト",
        body: "低モーション設定でもハンドアウト進行を利用できる。"
      },
      link: { disabled: true, href: "", text: "" }
    }
  ]
};

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "apikey, authorization, content-type, x-client-info",
  "access-control-allow-methods": "POST, OPTIONS",
  "content-type": "application/json"
};

async function mockRpc(route, body) {
  if (route.request().method() === "OPTIONS") {
    await route.fulfill({ status: 204, headers: corsHeaders, body: "" });
    return;
  }
  await route.fulfill({ status: 200, headers: corsHeaders, body: JSON.stringify(body) });
}

test("reduced-motion keeps the luxury ACT narrative available while physical animation is reduced", async ({ page }) => {
  test.setTimeout(20_000);
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/rest/v1/rpc/get_public_act_showcase", route => mockRpc(route, showcase));
  await page.route("**/rest/v1/rpc/get_public_act_showcase_guests", route => mockRpc(route, []));

  await page.goto("/act-showcase.html?id=e2e-reduced-motion", { waitUntil: "domcontentloaded" });

  const intro = page.locator("#cinematic-intro");
  await expect(intro).toHaveClass(/neotokyo-sequence/, { timeout: 8_000 });
  await expect(intro).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator("body")).toHaveClass(/showcase-neotokyo-reduced/);

  const advance = page.locator(".neotokyo-sequence__advance");
  await expect(advance).toBeVisible({ timeout: 12_000 });
  await expect(advance).toHaveText("NEXT // ACT TRAILER");

  const motion = await page.locator(".neotokyo-sequence__screen").evaluate(element => ({
    transitionDuration: getComputedStyle(element).transitionDuration,
    animationName: getComputedStyle(element).animationName
  }));
  expect(motion.transitionDuration).toBe("0s");
  expect(motion.animationName).toBe("none");
  expect(pageErrors).toEqual([]);
});
