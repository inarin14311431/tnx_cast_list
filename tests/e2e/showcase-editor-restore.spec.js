import { test, expect } from "@playwright/test";
import { hasAuthCredentials } from "./helpers.js";

const ownedShowcase = {
  slug: "e2e-edit-restore",
  actName: "復元テストアクト",
  rulerName: "E2E RULER",
  showcasePublic: true,
  showcaseUpdatedAt: "2026-09-09T00:00:00Z",
  showcaseData: {
    version: 2,
    pageTitle: "RESTORE PAGE TITLE",
    actName: "復元テストアクト",
    rulerName: "E2E RULER",
    trailer: { title: "ACT TRAILER", body: "保存済みトレーラー本文" },
    background: "https://example.invalid/background.webp",
    casts: [{
      serial: "PRIVATE",
      fullName: "復元用手動キャスト",
      styles: [{ label: "カブト◎", handoutRole: true }, { label: "フェイト●", handoutRole: false }],
      meta: [{ label: "PLAYER", value: "E2E PLAYER" }],
      tagline: "“保存済みの一言”",
      handout: { title: "『カブト』用ハンドアウト", body: "保存済みハンドアウト本文" }
    }]
  },
  participants: []
};

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "apikey, authorization, content-type, x-client-info",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "content-type": "application/json"
};

test.beforeEach(() => {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");
});

async function fulfillJson(route, body) {
  if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: corsHeaders, body: "" });
  return route.fulfill({ status: 200, headers: corsHeaders, body: JSON.stringify(body) });
}

test("owned showcase can be restored into generator fields", async ({ page }) => {
  await page.route("**/rest/v1/acts?**", route => fulfillJson(route, [{
    slug: ownedShowcase.slug,
    act_name: ownedShowcase.actName,
    ruler_name: ownedShowcase.rulerName,
    showcase_public: true,
    showcase_updated_at: ownedShowcase.showcaseUpdatedAt,
    updated_at: ownedShowcase.showcaseUpdatedAt
  }]));
  await page.route("**/rest/v1/rpc/get_owned_act_showcase_editor", route => fulfillJson(route, ownedShowcase));

  await page.goto(`/showcase-generator.html?edit=${ownedShowcase.slug}`, { waitUntil: "domcontentloaded" });

  await expect(page.locator("#owned-showcase-restore")).toBeVisible({ timeout: 12_000 });
  await expect(page.locator("#page-title")).toHaveValue("RESTORE PAGE TITLE", { timeout: 12_000 });
  await expect(page.locator("#act-name")).toHaveValue("復元テストアクト");
  await expect(page.locator("#ruler-name")).toHaveValue("E2E RULER");
  await expect(page.locator("#intro-text")).toHaveValue("保存済みトレーラー本文");
  await expect(page.locator("#background-url")).toHaveValue("https://example.invalid/background.webp");

  const restored = page.locator('#selected-casts [data-selected-index="0"]');
  await expect(restored).toBeVisible();
  await expect(restored.locator('[data-field="manual-name"]')).toHaveValue("復元用手動キャスト");
  await expect(restored.locator('[data-field="manual-styles"]')).toHaveValue("カブト◎ / フェイト●");
  await expect(restored.locator('[data-field="manual-player"]')).toHaveValue("E2E PLAYER");
  await expect(restored.locator('[data-field="quote"]')).toHaveValue("カブト");
  await expect(restored.locator('[data-field="description"]')).toHaveValue("保存済みハンドアウト本文");
  await expect(restored.locator('[data-field="tagline"]')).toHaveValue("保存済みの一言");
  await expect(page).not.toHaveURL(/\?edit=/);
});

test("owned showcase can be deleted while the current editor contents remain", async ({ page }) => {
  await page.route("**/rest/v1/acts?**", route => fulfillJson(route, [{
    slug: ownedShowcase.slug,
    act_name: ownedShowcase.actName,
    ruler_name: ownedShowcase.rulerName,
    showcase_public: true,
    showcase_updated_at: ownedShowcase.showcaseUpdatedAt,
    updated_at: ownedShowcase.showcaseUpdatedAt
  }]));

  let deleteSlug = "";
  await page.route("**/rest/v1/rpc/delete_owned_act_showcase", async route => {
    deleteSlug = JSON.parse(route.request().postData() || "{}").p_slug || "";
    await fulfillJson(route, { deleted: true, slug: deleteSlug, deletedGuestCount: 2 });
  });

  await page.goto("/showcase-generator.html", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#delete-owned-showcase")).toBeVisible({ timeout: 12_000 });
  await page.locator("#act-name").fill("削除後も残す編集中データ");
  await page.locator("#owned-showcase-select").selectOption(ownedShowcase.slug);
  await expect(page.locator("#delete-owned-showcase")).toBeEnabled();

  page.once("dialog", dialog => dialog.accept());
  await page.locator("#delete-owned-showcase").click();

  await expect.poll(() => deleteSlug).toBe(ownedShowcase.slug);
  await expect(page.locator("#owned-showcase-status")).toContainText("アクト紹介を削除しました。");
  await expect(page.locator("#owned-showcase-select")).toHaveValue("");
  await expect(page.locator("#act-name")).toHaveValue("削除後も残す編集中データ");
});
