import { test, expect } from "@playwright/test";
import { ACT_SLUG, installHeldActShowcaseRoutes } from "./fixtures/act-showcase-data.js";

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
    const seen = { eyebrow: new Set(), title: new Set(), sub: new Set(), node: new Set(), loadTitle: new Set(), loadSub: new Set(), progress: new Set(), loadOverline: new Set(), loadingArea: new Set() };
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
      read(document, ".cinematic-intro__overline", "loadOverline");
      // Everything the loading screen and the status line show, as one string: the pre-script HTML must not
      // carry the old wording either.
      seen.loadingArea.add(`${document.querySelector("#cinematic-intro")?.textContent || ""}|${document.querySelector("#act-showcase-status")?.textContent || ""}`.replace(/\s+/g, " ").trim());
      read(document, ".neotokyo-sequence__footer > span", "progress");
    };
    new MutationObserver(scan).observe(document, { subtree: true, childList: true, characterData: true });
    // The parsed HTML before any module script runs (module scripts run after readyState "interactive").
    document.addEventListener("readystatechange", scan);
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
  // From the very first HTML: the loading screen's three lines and the status line are final from the start.
  expect(seen.loadOverline).toEqual(["N◎VA MUNICIPAL DATABASE // PUBLIC ACT FILE"]);
  expect(seen.loadTitle).toEqual(["ACT FILE // ACCESS"]);
  expect(seen.loadSub.filter(text => !/^CONNECTING TO PUBLIC ACT FILE…/.test(text))).toEqual([]);
  for (const area of seen.loadingArea) expect(area).not.toMatch(/ACT SHOWCASE|PUBLIC ARCHIVE ACCESS|読み込み中/);
  // The progress label starts at INITIALIZING and the first stage is ACT FILE ACCESS // 05%.
  expect(seen.progress).toContain("ACT FILE ACCESS // 05%");
  for (const text of Object.values(seen).flat()) expect(text).not.toMatch(/NEOTOKYO|SYSTEM ACCESS|公開アクトファイルへ接続中/i);
});

// The loading screen's three lines hand over to the ACCESS screen's three lines with the same words; the type
// must be the same too, or the letters visibly change shape at the switch.
for (const [width, height] of [[1440, 1000], [1024, 768], [390, 844]]) {
  test(`読み込み画面と同じ文言を出すアクセス画面は、見出し・小見出し・サブの書体・字間・位置が同じ(${width}x${height})`, async ({ browser }) => {
    test.setTimeout(60_000);
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const release = await installHeldActShowcaseRoutes(page);
    await page.goto(`/act-showcase.html?id=${ACT_SLUG}&theme=nova`);
    const read = selector => page.evaluate(sel => {
      const element = document.querySelector(sel);
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        family: style.fontFamily, weight: style.fontWeight, size: style.fontSize, letterSpacing: style.letterSpacing,
        lineHeight: style.lineHeight, textIndent: style.textIndent, top: rect.top, centerX: rect.left + rect.width / 2, height: rect.height
      };
    }, selector);
    await expect(page.locator(".cinematic-intro__title")).toHaveText("ACT FILE // ACCESS");
    const loading = { eyebrow: await read(".cinematic-intro__overline"), title: await read(".cinematic-intro__title"), sub: await read(".cinematic-intro__sub") };
    release();
    await expect(page.locator(".neotokyo-sequence__screen--opening .neotokyo-sequence__opening-title")).toBeVisible({ timeout: 15_000 });
    // The three lines fade / track in when the ACCESS screen appears: measure them once their entrance has finished.
    await page.waitForFunction(() => [".neotokyo-sequence__eyebrow", ".neotokyo-sequence__opening-title", ".neotokyo-sequence__opening-sub"]
      .every(selector => document.querySelector(`.neotokyo-sequence__screen--opening ${selector}`).getAnimations().every(animation => animation.playState === "finished")), null, { timeout: 10_000 });
    const access = {
      eyebrow: await read(".neotokyo-sequence__screen--opening .neotokyo-sequence__eyebrow"),
      title: await read(".neotokyo-sequence__opening-title"),
      sub: await read(".neotokyo-sequence__opening-sub")
    };
    for (const key of ["eyebrow", "title", "sub"]) {
      for (const property of ["family", "weight", "size", "letterSpacing", "lineHeight", "textIndent"]) {
        expect(loading[key][property], `${key}.${property}`).toBe(access[key][property]);
      }
      expect(Math.abs(loading[key].centerX - access[key].centerX), `${key} centre`).toBeLessThanOrEqual(1);
      // The ACCESS screen is centred around a taller stack (boot log, seal); the loading screen is offset to match.
      expect(Math.abs(loading[key].top - access[key].top), `${key} top`).toBeLessThanOrEqual(8);
    }
    await context.close();
  });
}

// What the static HTML shows before any script runs is exactly what the script then shows: same words, same type,
// same place. Scripts are blocked for the first page; the second runs them with the data request held.
async function loadingBox(page) {
  return page.evaluate(() => {
    const read = selector => {
      const element = document.querySelector(selector);
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        text: element.textContent.trim(),
        font: `${style.fontFamily}|${style.fontWeight}|${style.fontSize}|${style.letterSpacing}|${style.lineHeight}`,
        box: [rect.left, rect.top, rect.width, rect.height].map(value => Math.round(value * 10) / 10)
      };
    };
    return { overline: read(".cinematic-intro__overline"), title: read(".cinematic-intro__title"), sub: read(".cinematic-intro__sub") };
  });
}

for (const [width, height] of [[1440, 1000], [390, 844]]) {
  test(`読み込み画面の文言・書体・位置は、スクリプトが動く前後で変わらない(${width}x${height})`, async ({ page, browser }) => {
    test.setTimeout(30_000);
    await page.setViewportSize({ width, height });
    await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
    await page.route("**/*.js*", route => route.abort());
    await page.goto("/act-showcase.html?id=e2e-final-copy", { waitUntil: "load" });
    await expect(page.locator("#act-showcase-status")).toHaveText("");
    const beforeScript = await loadingBox(page);
    expect(beforeScript.overline.text).toBe("N◎VA MUNICIPAL DATABASE // PUBLIC ACT FILE");
    expect(beforeScript.title.text).toBe("ACT FILE // ACCESS");
    expect(beforeScript.sub.text).toBe("CONNECTING TO PUBLIC ACT FILE…");

    const second = await browser.newPage({ viewport: { width, height } });
    await installHeldActShowcaseRoutes(second);
    await second.goto(`/act-showcase.html?id=${ACT_SLUG}`);
    await expect(second.locator(".cinematic-intro__sub")).toHaveText(/^CONNECTING TO PUBLIC ACT FILE…/);
    const afterScript = await loadingBox(second);
    await second.close();
    // The progress label may append to the sub line once the script runs; the first two lines and the sub's
    // start must be identical in words, type and position.
    expect(afterScript.overline).toEqual(beforeScript.overline);
    expect(afterScript.title).toEqual(beforeScript.title);
    expect(afterScript.sub.text.startsWith(beforeScript.sub.text)).toBe(true);
    expect(afterScript.sub.font).toBe(beforeScript.sub.font);
    expect(afterScript.sub.box.slice(0, 2)).toEqual(beforeScript.sub.box.slice(0, 2));
  });
}
