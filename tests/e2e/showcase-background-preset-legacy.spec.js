import { test, expect } from "@playwright/test";

// The generator keeps no preset key in a published act: the act stores the background URL and the editor
// finds the preset again from that URL. An act published with a since-retired preset (neon-market /
// incident-blockade) must open as a custom background, with its image still showing.
// Uses a fake session and mocked Supabase responses: nothing here talks to the real database.
const SUPABASE_ORIGIN = "https://koprmbkoftuuffslhsvt.supabase.co";
const USER_ID = "11111111-1111-4111-8111-111111111111";
const RETIRED = ["neon-market.svg", "incident-blockade.svg"];

function fakeJwt() {
  const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: USER_ID, aud: "authenticated", role: "authenticated", exp: 4102444800 })}.e2e`;
}

async function openEditorWithBackground(page, background) {
  const user = { id: USER_ID, email: "e2e@example.invalid", aud: "authenticated", role: "authenticated", last_sign_in_at: "2026-10-01T00:00:00.000Z" };
  await page.addInitScript(session => localStorage.setItem("sb-koprmbkoftuuffslhsvt-auth-token", JSON.stringify(session)), {
    access_token: fakeJwt(), refresh_token: "e2e-refresh", expires_in: 3600, expires_at: 4102444800, token_type: "bearer", user
  });
  const slug = "e2e-legacy-background";
  const showcase = {
    slug, actName: "旧プリセット背景のアクト", rulerName: "E2E RULER", showcasePublic: true, showcaseUpdatedAt: "2026-09-20T00:00:00Z",
    showcaseData: { version: 2, pageTitle: "LEGACY BACKGROUND", actName: "旧プリセット背景のアクト", rulerName: "E2E RULER", background,
      trailer: { title: "ACT TRAILER", body: "本文" }, casts: [{ serial: "PRIVATE", fullName: "手動キャスト", styles: [{ label: "カブト◎", handoutRole: true }], meta: [], tagline: "", handout: { title: "『カブト』用ハンドアウト", body: "本文" } }] },
    participants: []
  };
  await page.route(`${SUPABASE_ORIGIN}/**`, route => {
    const url = new URL(route.request().url());
    const json = (status, body) => route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) });
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET, POST, OPTIONS" }, body: "" });
    if (url.pathname === "/auth/v1/user") return json(200, user);
    if (url.pathname === "/rest/v1/rpc/get_owned_act_showcase_editor") return json(200, showcase);
    if (url.pathname === "/rest/v1/acts") return json(200, [{ slug, act_name: showcase.actName, ruler_name: showcase.rulerName, showcase_public: true, showcase_updated_at: showcase.showcaseUpdatedAt, updated_at: showcase.showcaseUpdatedAt }]);
    if (route.request().method() === "GET") return json(200, []);
    return json(405, { message: `Unhandled route: ${url.pathname}` });
  });
  await page.goto(`/showcase-generator.html?edit=${slug}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#background-url")).not.toHaveValue("", { timeout: 15_000 });
}

test("プリセットは10件で、4番目がグリーンエリア・7番目が電脳空間", async ({ page, request }) => {
  await openEditorWithBackground(page, "https://example.invalid/custom.webp");
  const names = await page.locator("#background-preset-grid strong").allTextContents();
  expect(names).toHaveLength(10);
  expect(names[3]).toBe("グリーンエリア");
  expect(names[6]).toBe("電脳空間");
  expect(names).not.toContain("イエローエリア");
  expect(names).not.toContain("封鎖区域");
});

for (const fileName of RETIRED) {
  test(`旧プリセット(${fileName})で公開済みのアクトは、編集画面で個別指定の背景として開き、画像も表示できる`, async ({ page, request }) => {
    const savedUrl = new URL(`/assets/showcase/backgrounds/${fileName}?v=20260910-user-images-v4-attached-situations`, "http://127.0.0.1:4173").href;
    await openEditorWithBackground(page, savedUrl);

    // Kept as the act's own (custom) background: not replaced, and no preset is marked selected.
    await expect(page.locator("#background-url")).toHaveValue(savedUrl);
    await expect(page.locator("#background-preset")).toHaveValue("");
    await expect(page.locator("#background-preset-grid .is-selected")).toHaveCount(0);

    // The old image is still served, so the published act keeps its background.
    const response = await request.get(savedUrl);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toMatch(/svg/);

    // Choosing a new preset still works from here.
    await page.locator("#background-preset-grid button").nth(3).click();
    await expect(page.locator("#background-preset")).toHaveValue("green-area");
    await expect(page.locator("#background-url")).toHaveValue(/\/green-area\.avif\?v=/);
    await page.locator("#background-preset-grid button").nth(6).click();
    await expect(page.locator("#background-preset")).toHaveValue("cyberspace");
    await expect(page.locator("#background-url")).toHaveValue(/\/cyberspace\.avif\?v=/);
  });
}
