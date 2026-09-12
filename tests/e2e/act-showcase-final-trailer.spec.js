import { test, expect } from "@playwright/test";

const showcase = {
  version: 2,
  pageTitle: "FINAL TRAILER E2E",
  heroTitle: "TOKYO N◎VA THE AXLERATION",
  heroSubTitle: "CAST SHOWCASE",
  actName: "E2E FINAL TRAILER ACT",
  rulerName: "E2E RULER",
  background: "",
  trailer: {
    title: "THE LAST SIGNAL",
    body: "夜のN◎VAに最後のシグナルが響く。\nその呼び声に応え、キャストたちはアクトへ向かう。"
  },
  casts: [{
    slot: "CAST 01",
    serial: "E2E-01",
    fullName: "E2E CAST",
    reading: "イーツーイー キャスト",
    tagline: "FINAL TRAILER TEST",
    imageUrl: "",
    imageAlt: "E2E CAST",
    styles: [{ label: "カブト◎", handoutRole: true }],
    meta: [],
    handout: { title: "カブト用ハンドアウト", body: "アクトへ参加せよ。" },
    link: { disabled: true, href: "", text: "" }
  }]
};

const guest = [{
  sort_order: 1,
  handle: "GUEST",
  name: "E2E SUPPORT",
  persona_style: "トーキー",
  affiliation: "TEST",
  gender: "—",
  age: "—",
  tagline: "SUPPORTING",
  summary: "",
  image_url: ""
}];

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

async function registerRoutes(page, data = showcase, guests = guest) {
  await page.route("**/rest/v1/rpc/get_public_act_showcase", route => mockRpc(route, data));
  await page.route("**/rest/v1/rpc/get_public_act_showcase_guests", route => mockRpc(route, guests));
}

test("豪華版の最終ページに通常版と同じ公開トレーラーを表示する", async ({ page }) => {
  await registerRoutes(page);
  await page.goto("/act-showcase.html?id=e2e-final-trailer", { waitUntil: "domcontentloaded" });

  const trailer = page.locator("#poster-final-act-trailer");
  await expect(trailer).toHaveCount(1);
  await expect(trailer.locator(".poster-v2-final-trailer__title")).toHaveText("THE LAST SIGNAL");
  await expect(trailer.locator(".poster-v2-final-trailer__copy")).toHaveText(showcase.trailer.body);
  await expect(page.locator("#poster-supporting-cast")).toHaveCount(1);

  await expect.poll(() => page.locator("#showcase-story").evaluate(story => story.lastElementChild?.id || ""), {
    timeout: 8_000
  }).toBe("poster-final-act-trailer");
});

test("公開トレーラー未登録時は最終トレーラーページを追加しない", async ({ page }) => {
  await registerRoutes(page, { ...showcase, trailer: null }, []);
  await page.goto("/act-showcase.html?id=e2e-no-final-trailer", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#poster-showcase-board-v2")).toHaveCount(1);
  await expect(page.locator("#poster-final-act-trailer")).toHaveCount(0);
});
