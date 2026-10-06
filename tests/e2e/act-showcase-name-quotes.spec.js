import { test, expect } from "@playwright/test";

// Fixed data whose cast and guest names carry doubled quotes. The names are normalized when the data is
// read, so a doubled quote must never reach the DOM, not even for a frame.
const showcase = {
  version: 2,
  pageTitle: "NAME QUOTES E2E",
  heroTitle: "TOKYO N◎VA THE AXLERATION",
  heroSubTitle: "E2E NAME QUOTES",
  actName: "E2E NAME QUOTES",
  rulerName: "E2E RULER",
  background: "",
  trailer: { title: "ACT TRAILER", body: "テスト用アクトトレーラー。" },
  casts: [{
    slot: "CAST 01",
    serial: "E2E-QUOTE-01",
    fullName: "““テスト”” 名前",
    reading: "““ヨミ”” テストナマエ",
    tagline: "NAME QUOTES TEST",
    imageUrl: "",
    imageAlt: "",
    styles: [{ label: "カブト◎", handoutRole: true }],
    meta: [],
    handout: { title: "カブト用ハンドアウト", body: "引用符テスト。" },
    link: { disabled: true, href: "", text: "" }
  }]
};
const guests = [{
  sort_order: 1, handle: "““ゲスト””", name: "ゲスト 名前", persona_style: "カブト◎", affiliation: "", gender: "", age: "",
  tagline: "", summary: "", image_url: ""
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

// Installed before any page script runs. Every mutation re-reads the whole page: its text, and the
// alt / aria-label attributes (names are also used there). Any doubled quote is recorded with its text.
async function watchDoubledQuotes(page) {
  await page.addInitScript(() => {
    const doubled = /[“"]{2,}|[”"]{2,}/;
    const bad = new Set();
    const names = new Set();
    window.__quoteWatch = { bad, names };
    const scan = () => {
      const root = document.body;
      if (!root) return;
      for (const element of root.querySelectorAll("*")) {
        for (const attribute of ["alt", "aria-label"]) {
          const value = element.getAttribute(attribute);
          if (value && doubled.test(value)) bad.add(`${element.tagName}[${attribute}] ${value}`);
        }
        if (element.children.length === 0) {
          const value = element.textContent || "";
          if (doubled.test(value)) bad.add(`${element.tagName}.${element.className} ${value}`);
          if (value.includes("テスト") || value.includes("ゲスト")) names.add(value.trim());
        }
      }
    };
    new MutationObserver(scan).observe(document, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["alt", "aria-label"] });
  });
}

async function readWatch(page) {
  return page.evaluate(() => ({ bad: [...window.__quoteWatch.bad], names: [...window.__quoteWatch.names] }));
}

async function routes(page) {
  await page.route("**/rest/v1/rpc/get_public_act_showcase", route => mockRpc(route, showcase));
  await page.route("**/rest/v1/rpc/get_public_act_showcase_guests", route => mockRpc(route, guests));
}

test("豪華版: 引用符が重複した名前は、演出・最終ボード・ゲストのどこにも重複のまま出ない", async ({ page }) => {
  test.setTimeout(60_000);
  await watchDoubledQuotes(page);
  await routes(page);
  await page.goto("/act-showcase.html?id=e2e-name-quotes", { waitUntil: "domcontentloaded" });

  const advance = page.locator(".neotokyo-sequence__advance");
  const access = page.locator(".neotokyo-finale__access-button");
  for (let step = 0; step < 20 && !(await access.isVisible()); step += 1) {
    if (await advance.isVisible()) {
      const label = ((await advance.textContent()) || "").trim();
      await advance.click({ force: true });
      if (label !== "NEXT // ACT SUMMARY") await expect(advance).not.toHaveText(label, { timeout: 15_000 }).catch(() => {});
    } else {
      await page.waitForTimeout(500);
    }
  }
  await expect(access).toBeVisible({ timeout: 15_000 });
  await access.click({ force: true });
  await expect(page.locator(".poster-v2-board")).toBeVisible();
  await expect(page.locator(".poster-supporting-card h3")).toHaveText("“ゲスト” ゲスト 名前");
  await expect(page.locator(".poster-v2-name")).toHaveText("“テスト” 名前");

  const { bad, names } = await readWatch(page);
  expect(bad).toEqual([]);
  expect(names).toContain("“テスト” 名前");
});

test("スタンダード版: 引用符が重複した名前は、カード・ナビ・ゲストのどこにも重複のまま出ない", async ({ page }) => {
  await watchDoubledQuotes(page);
  await routes(page);
  await page.goto("/act-showcase-standard.html?id=e2e-name-quotes", { waitUntil: "domcontentloaded" });

  await expect(page.locator(".cast-card__name").first()).toHaveText("“テスト” 名前");
  await expect(page.locator(".cast-card__reading").first()).toHaveText("“ヨミ” テストナマエ");
  await expect(page.locator("#standard-showcase-guests .cast-card__name")).toHaveText("“ゲスト” ゲスト 名前");
  await expect(page.locator("#showcase-navigation a").first()).toContainText("“テスト” 名前");

  const { bad, names } = await readWatch(page);
  expect(bad).toEqual([]);
  expect(names).toContain("“テスト” 名前");
});
