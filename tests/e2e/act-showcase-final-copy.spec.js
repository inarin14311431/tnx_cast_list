import { test, expect } from "@playwright/test";

const showcase = {
  version: 2,
  pageTitle: "FINAL COPY E2E",
  heroTitle: "TOKYO N◎VA THE AXLERATION",
  heroSubTitle: "E2E FINAL COPY",
  actName: "E2E FINAL COPY",
  rulerName: "E2E RULER",
  background: "",
  trailer: { title: "ACT TRAILER", body: "テスト用アクトトレーラー。" },
  casts: [{
    slot: "CAST 01",
    serial: "E2E-COPY-01",
    fullName: "E2E CAST",
    reading: "イーツーイー キャスト",
    tagline: "FINAL COPY TEST",
    imageUrl: "",
    imageAlt: "E2E CAST",
    styles: [{ label: "カブト◎", handoutRole: true }],
    meta: [],
    handout: { title: "カブト用ハンドアウト", body: "最終文言テスト。" },
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

test("読み込み画面・アクセス画面の3行・進捗ラベル・NODEラベルは書き換え前の文言を一度も出さない", async ({ page }) => {
  test.setTimeout(30_000);
  // The observer is installed before any page script runs, so it sees every text the page ever
  // puts into these elements, including a draft that is overwritten in a later microtask.
  await page.addInitScript(() => {
    const seen = { eyebrow: new Set(), title: new Set(), sub: new Set(), node: new Set(), loadTitle: new Set(), loadSub: new Set(), progress: new Set() };
    window.__accessCopySeen = seen;
    const scan = () => {
      const opening = document.querySelector(".neotokyo-sequence__screen--opening");
      const read = (scope, selector, bucket) => {
        for (const element of scope?.querySelectorAll(selector) || []) seen[bucket].add((element.textContent || "").trim());
      };
      read(opening, ".neotokyo-sequence__eyebrow", "eyebrow");
      read(opening, ".neotokyo-sequence__opening-title", "title");
      read(opening, ".neotokyo-sequence__opening-sub", "sub");
      read(document, ".neotokyo-sequence__system span", "node");
      read(document, ".cinematic-intro__title", "loadTitle");
      read(document, ".cinematic-intro__sub", "loadSub");
      read(document, ".neotokyo-sequence__footer > span", "progress");
    };
    new MutationObserver(scan).observe(document, { subtree: true, childList: true, characterData: true });
  });

  // Hold the showcase RPC so the loading screen stays up until it has been observed.
  let releaseShowcase;
  const held = new Promise(resolve => { releaseShowcase = resolve; });
  await page.route("**/rest/v1/rpc/get_public_act_showcase", async route => {
    await held;
    await mockRpc(route, showcase);
  });
  await page.route("**/rest/v1/rpc/get_public_act_showcase_guests", route => mockRpc(route, []));
  await page.goto("/act-showcase.html?id=e2e-final-copy", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".cinematic-intro__title")).toHaveText("ACT FILE // ACCESS");
  await expect(page.locator(".cinematic-intro__sub")).toHaveText("CONNECTING TO PUBLIC ACT FILE…");
  releaseShowcase();

  // The access screen lasts a few seconds; the first NEXT button means it has been replaced.
  await expect(page.locator(".neotokyo-sequence__advance")).toHaveText("NEXT // ACT TRAILER", { timeout: 15_000 });
  const seen = await page.evaluate(() => Object.fromEntries(Object.entries(window.__accessCopySeen).map(([key, set]) => [key, [...set]])));

  expect(seen.eyebrow).toEqual(["01 // N◎VA MUNICIPAL DATABASE"]);
  expect(seen.title).toEqual(["ACT FILE // ACCESS"]);
  expect(seen.sub).toEqual(["ESTABLISHING PUBLIC SESSION"]);
  expect(seen.node).toContain("NODE // TOKYO N◎VA");
  // The loading screen never shows the pre-5c wording (it starts from the static HTML, then the final copy).
  expect(seen.loadTitle).not.toContain("SYSTEM ACCESS");
  expect(seen.loadSub).not.toContain("公開アクトファイルへ接続中…");
  expect(seen.loadSub).toContain("CONNECTING TO PUBLIC ACT FILE…");
  // The progress label starts at INITIALIZING and the first stage is ACT FILE ACCESS // 05%.
  expect(seen.progress).toContain("ACT FILE ACCESS // 05%");
  for (const text of Object.values(seen).flat()) expect(text).not.toMatch(/NEOTOKYO|SYSTEM ACCESS|公開アクトファイルへ接続中/i);
});
