import { test as setup, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { authEnv, hasAuthCredentials } from "./helpers.js";

const AUTH_STATE = "playwright/.auth/user.json";

setup("ログイン状態を保存", async ({ page }) => {
  await mkdir("playwright/.auth", { recursive: true });

  if (!hasAuthCredentials()) {
    await writeFile(AUTH_STATE, JSON.stringify({ cookies: [], origins: [] }, null, 2));
    console.log("E2E auth skipped: E2E_EMAIL / E2E_PASSWORD are not configured.");
    return;
  }

  const { email, password } = authEnv();
  await page.goto("/login.html");
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(password);
  await page.locator("#login-form button[type=submit]").click();

  await expect(page).not.toHaveURL(/login\.html/, { timeout: 20_000 });
  await page.waitForFunction(() =>
    Object.keys(localStorage).some(key => /^sb-.*-auth-token$/.test(key)),
    null,
    { timeout: 15_000 }
  );

  await page.context().storageState({ path: AUTH_STATE });
});
