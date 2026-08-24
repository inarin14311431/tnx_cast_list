import { expect } from "@playwright/test";

export function getTestCastId() {
  return process.env.E2E_CAST_ID || process.env.TEST_CAST_ID || "TNX-000091";
}

export function getTestTroopId() {
  return process.env.E2E_TROOP_ID || process.env.TEST_TROOP_ID || "TRP-56F796299BEC";
}

export function hasAuthCredentials() {
  return Boolean(
    (process.env.E2E_EMAIL || process.env.TEST_EMAIL) &&
    (process.env.E2E_PASSWORD || process.env.TEST_PASSWORD)
  );
}

export function authEnv() {
  return {
    email: process.env.E2E_EMAIL || process.env.TEST_EMAIL || "",
    password: process.env.E2E_PASSWORD || process.env.TEST_PASSWORD || ""
  };
}

export function watchPageErrors(page) {
  const errors = [];
  const handler = error => errors.push(error);
  page.on("pageerror", handler);
  return () => {
    page.off("pageerror", handler);
    expect(errors, errors.map(error => error.stack || error.message).join("\n\n")).toEqual([]);
  };
}

export function watchStaticAssetErrors(page) {
  const errors = [];
  const handler = response => {
    if (response.status() < 400) return;
    const url = new URL(response.url());
    if (!/\.(?:css|js)(?:$|\?)/i.test(`${url.pathname}${url.search}`)) return;
    errors.push(`${response.status()} ${url.pathname}${url.search}`);
  };
  page.on("response", handler);
  return () => {
    page.off("response", handler);
    expect(errors, errors.join("\n")).toEqual([]);
  };
}

export async function disableAnimations(page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        scroll-behavior: auto !important;
      }
    `
  });
}

export async function waitForEditorReady(page) {
  await expect(page).not.toHaveURL(/login\.html/);
  await expect(page.locator("#save-button")).toBeVisible();
  await expect(page.locator("#character-name")).not.toHaveValue("");
}

export async function waitForCastReady(page) {
  await expect(page.locator("#cast-content")).toBeVisible();
}
