import { test, expect } from "@playwright/test";
import { watchPageErrors, watchStaticAssetErrors } from "./helpers.js";

const SUPABASE_ORIGIN = "https://koprmbkoftuuffslhsvt.supabase.co";
const AUTH_STORAGE_KEY = "sb-koprmbkoftuuffslhsvt-auth-token";
const USER_ID = "11111111-1111-4111-8111-111111111111";

function fakeJwt() {
  const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg:"HS256", typ:"JWT" })}.${encode({ sub:USER_ID, aud:"authenticated", role:"authenticated", exp:Math.floor(Date.now() / 1000) + 3600 })}.e2e`;
}

async function installMockSupabase(page) {
  const user = { id:USER_ID, email:"troop-e2e@example.invalid", aud:"authenticated", role:"authenticated" };
  const accessToken = fakeJwt();
  let record = null;

  await page.addInitScript(({ key, session }) => {
    localStorage.setItem(key, JSON.stringify(session));
  }, {
    key:AUTH_STORAGE_KEY,
    session:{ access_token:accessToken, refresh_token:"e2e-refresh", expires_in:3600, expires_at:Math.floor(Date.now() / 1000) + 3600, token_type:"bearer", user }
  });

  await page.route(`${SUPABASE_ORIGIN}/**`, async route => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const json = (status, body) => route.fulfill({ status, contentType:"application/json", body:JSON.stringify(body) });

    if (url.pathname === "/auth/v1/user") return json(200, user);
    if (url.pathname === "/rest/v1/characters" && method === "GET") return json(200, []);
    if (url.pathname === "/rest/v1/rpc/can_use_master_search") return json(200, false);
    if (url.pathname !== "/rest/v1/troops") return json(404, { message:`Unhandled E2E route: ${url.pathname}` });

    if (method === "POST") {
      const payload = JSON.parse(request.postData() || "{}");
      record = { ...(Array.isArray(payload) ? payload[0] : payload), id:"22222222-2222-4222-8222-222222222222", public_id:"TRP-E2ECRUD0001" };
      return json(201, { public_id:record.public_id });
    }
    if (method === "PATCH") {
      record = { ...record, ...JSON.parse(request.postData() || "{}") };
      return json(200, { public_id:record.public_id });
    }
    if (method === "DELETE") {
      record = null;
      return route.fulfill({ status:204, body:"" });
    }
    if (method === "GET") {
      if (!record) return route.fulfill({ status:406, contentType:"application/json", body:JSON.stringify({ code:"PGRST116", details:"0 rows", message:"JSON object requested, multiple (or no) rows returned" }) });
      return json(200, record);
    }
    return json(405, { message:`Unhandled E2E method: ${method}` });
  });
}

test("トループを作成・再読込・更新・閲覧・削除できる", async ({ page }) => {
  await installMockSupabase(page);
  const assertNoErrors = watchPageErrors(page);
  const assertNoAssetErrors = watchStaticAssetErrors(page);
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const initialName = `E2E TROOP ${unique}`;
  const updatedName = `${initialName} UPDATED`;
  let editUrl = "";

  try {
    await page.goto("/troop.html?edit=1");
    await expect(page.locator("#troop-editor")).toBeVisible();
    await page.locator("#troop-name").fill(initialName);
    await page.locator("#troop-style").selectOption({ label:"カタナ" });
    await page.locator("#troop-level").fill("3");
    await page.locator("#troop-member-max").fill("12");
    await page.locator("#troop-notes").fill("E2E create / reload / update / delete");

    await page.locator("#troop-combo-add").click();
    const comboDialog = page.locator("#troop-combo-dialog");
    await expect(comboDialog).toBeVisible();
    await comboDialog.locator('[name="name"]').fill("E2Eコンボ");
    await comboDialog.locator('[name="ability_choice"][value="reason"]').check();
    await comboDialog.locator('[name="modifier"]').fill("2");
    await comboDialog.locator('[name="expected_value"]').fill("18");
    await comboDialog.locator('[name="confrontation"]').fill("〈回避〉");
    await comboDialog.locator('[name="timing"]').fill("メジャー");
    await comboDialog.locator('[name="target"]').fill("単体");
    await comboDialog.locator('[name="range"]').fill("至近");
    await comboDialog.locator('[name="description"]').fill("CRUD回帰確認用");
    await comboDialog.locator('button[type="submit"]').click();
    await expect(comboDialog).toBeHidden();
    await expect(page.locator("#troop-combo-cards .combo-card")).toHaveCount(1);

    await page.locator('.troop-editor-actions button[type="submit"]').click();
    await expect(page.locator("#troop-editor-status")).toContainText("保存しました");
    await expect.poll(() => {
      const current = new URL(page.url());
      return `${current.pathname}|${current.searchParams.get("id")}|${current.searchParams.get("edit")}`;
    }).toMatch(/\/troop\.html\|TRP-[A-Z0-9]+\|1/);
    editUrl = page.url();

    await page.reload();
    await expect(page.locator("#troop-editor")).toBeVisible();
    await expect(page.locator("#troop-name")).toHaveValue(initialName);
    await expect(page.locator("#troop-level")).toHaveValue("3");
    await expect(page.locator("#troop-member-max")).toHaveValue("12");
    await expect(page.locator("#troop-combo-cards .combo-card")).toHaveCount(1);

    await page.locator("#troop-combo-cards .combo-card").click();
    await expect(comboDialog.locator('[name="expected_value"]')).toHaveValue("18");
    await expect(comboDialog.locator('[name="confrontation"]')).toHaveValue("〈回避〉");
    await comboDialog.locator("#troop-combo-cancel").click();

    await page.locator("#troop-name").fill(updatedName);
    await page.locator('.troop-editor-actions button[type="submit"]').click();
    await expect(page.locator("#troop-editor-status")).toContainText("保存しました");

    const viewUrl = new URL(editUrl);
    viewUrl.searchParams.delete("edit");
    await page.goto(viewUrl.href);
    await expect(page.locator("#troop-view")).toBeVisible();
    await expect(page.locator("#troop-name-view")).toHaveText(updatedName);
    await expect(page.locator("#troop-level-view")).toHaveText("3");
    await expect(page.locator("#troop-member-max-view")).toHaveText("12");
    await expect(page.locator("#troop-combos-view .troop-view-combo")).toContainText("E2Eコンボ");

    await page.goto(editUrl);
    page.once("dialog", dialog => dialog.accept());
    await page.locator("#troop-delete").click();
    await expect(page).toHaveURL(/troops\.html/);
    editUrl = "";
  } finally {
    if (editUrl) {
      await page.goto(editUrl).catch(() => {});
      page.once("dialog", dialog => dialog.accept());
      await page.locator("#troop-delete").click({ timeout:5_000 }).catch(() => {});
    }
    assertNoErrors();
    assertNoAssetErrors();
  }
});
