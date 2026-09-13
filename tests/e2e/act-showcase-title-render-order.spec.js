import { test, expect } from "@playwright/test";

const showcase = {
  version: 2,
  pageTitle: "TITLE ORDER E2E",
  heroTitle: "TOKYO N◎VA THE AXLERATION",
  heroSubTitle: "E2E TITLE SUBTITLE",
  actName: "E2E TITLE RENDER ORDER",
  rulerName: "E2E RULER",
  background: "",
  trailer: { title: "ACT TRAILER", body: "テスト用アクトトレーラー。" },
  casts: [{
    slot: "CAST 01",
    serial: "E2E-TITLE-01",
    fullName: "E2E CAST",
    reading: "イーツーイー キャスト",
    tagline: "TITLE ORDER TEST",
    imageUrl: "",
    imageAlt: "E2E CAST",
    styles: [{ label: "カブト◎", handoutRole: true }],
    meta: [],
    handout: { title: "カブト用ハンドアウト", body: "タイトル描画順テスト。" },
    link: { disabled: true, href: "", text: "" }
  }]
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

test("タイトル画面は最初に表示されるフレームから最終装飾とDOM順序が確定している", async ({ page }) => {
  test.setTimeout(30_000);
  await page.addInitScript(() => {
    window.__titleVisibleSnapshot = null;
    const capture = () => {
      const screen = document.querySelector(".neotokyo-sequence__screen--title.is-visible");
      if (!screen || window.__titleVisibleSnapshot) return;
      const title = screen.querySelector(".neotokyo-sequence__act-title");
      window.__titleVisibleSnapshot = {
        screenClass: screen.className,
        titleClass: title?.className || "",
        titleFit: title?.dataset.fit || "",
        order: [...screen.children].map(child => child.className || child.tagName)
      };
    };
    document.addEventListener("DOMContentLoaded", () => {
      const observer = new MutationObserver(capture);
      observer.observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["class"]
      });
      capture();
    }, { once: true });
  });

  await page.route("**/rest/v1/rpc/get_public_act_showcase", route => mockRpc(route, showcase));
  await page.route("**/rest/v1/rpc/get_public_act_showcase_guests", route => mockRpc(route, []));
  await page.goto("/act-showcase.html?id=e2e-title-render-order", { waitUntil: "domcontentloaded" });

  const advance = page.locator(".neotokyo-sequence__advance");
  await expect(advance).toHaveText("NEXT // ACT TRAILER", { timeout: 12_000 });

  await expect.poll(async () => page.evaluate(() => window.__titleVisibleSnapshot), {
    timeout: 5_000,
    intervals: [50, 100, 200]
  }).not.toBeNull();
  const snapshot = await page.evaluate(() => window.__titleVisibleSnapshot);

  expect(snapshot.screenClass).toContain("neotokyo-sequence__screen--title-logo");
  expect(snapshot.titleClass).toContain("neotokyo-sequence__act-title--logo");
  expect(snapshot.titleClass).toContain("showcase-fit-title");
  expect(snapshot.titleClass).toContain("is-cinematic-title");
  expect(snapshot.titleFit).not.toBe("");

  const indexOf = fragment => snapshot.order.findIndex(value => String(value).includes(fragment));
  const metaIndex = indexOf("neotokyo-title-logo__meta");
  const ghostIndex = indexOf("neotokyo-title-logo__ghost");
  const titleIndex = indexOf("neotokyo-sequence__act-title");
  const subtitleIndex = indexOf("neotokyo-sequence__act-subtitle");
  const ruleIndex = indexOf("neotokyo-title-logo__rule");
  const rulerIndex = indexOf("neotokyo-sequence__ruler-credit");

  expect(metaIndex).toBeGreaterThanOrEqual(0);
  expect(ghostIndex).toBeGreaterThan(metaIndex);
  expect(titleIndex).toBeGreaterThan(ghostIndex);
  expect(subtitleIndex).toBeGreaterThan(titleIndex);
  expect(ruleIndex).toBeGreaterThan(subtitleIndex);
  expect(rulerIndex).toBeGreaterThan(ruleIndex);

  await page.waitForTimeout(150);
  const settledOrder = await page.locator(".neotokyo-sequence__screen--title").evaluate(screen =>
    [...screen.children].map(child => child.className || child.tagName)
  );
  expect(settledOrder).toEqual(snapshot.order);
});
