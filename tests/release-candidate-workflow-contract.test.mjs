import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const regression = await readFile(new URL("../.github/workflows/regression.yml", import.meta.url), "utf8");
const security = await readFile(new URL("../.github/workflows/security.yml", import.meta.url), "utf8");
const playwright = await readFile(new URL("../.github/workflows/playwright.yml", import.meta.url), "utf8");

test("release candidate keeps comprehensive static/runtime audits in regression CI", () => {
  for (const command of [
    "npm run check:js",
    "npm run audit:modules",
    "npm run audit:integrity",
    "npm run audit:css",
    "npm run audit:themes",
    "npm run audit:sheet",
    "npm run audit:cast",
    "npm run audit:troop",
    "npm run audit:mobile",
    "npm run audit:security",
    "npm run audit:migrations",
    "npm run audit:quality",
    "npm run audit:js-reachability",
    "npm run audit:ci",
    "npm test"
  ]) {
    assert.match(regression, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("release candidate keeps security as an independent second gate", () => {
  assert.match(security, /npm run audit:security/);
});

test("release candidate keeps current public and authenticated audit E2E paths", () => {
  for (const spec of [
    "tests/e2e/audit-coverage.spec.js",
    "tests/e2e/smoke.spec.js",
    "tests/e2e/cast-view.spec.js",
    "tests/e2e/troop-view.spec.js",
    "tests/e2e/editor-help.spec.js",
    "tests/e2e/direct-transfer.spec.js",
    "tests/e2e/character-sheet-url-import-live.spec.js",
    "tests/e2e/authenticated.spec.js",
    "tests/e2e/style-skill-detail-integrity.spec.js",
    "tests/e2e/troop-editor-flow.spec.js"
  ]) {
    assert.match(playwright, new RegExp(spec.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(playwright, /E2E_REQUIRE_AUTH:\s*"1"/);
  assert.match(playwright, /E2E_EMAIL:\s*\$\{\{ secrets\.E2E_EMAIL \}\}/);
  assert.match(playwright, /E2E_PASSWORD:\s*\$\{\{ secrets\.E2E_PASSWORD \}\}/);
  assert.match(playwright, /E2E_CAST_ID:\s*\$\{\{ secrets\.E2E_CAST_ID \}\}/);
});

test("release candidate keeps critical mobile E2E paths after authenticated editor", () => {
  assert.match(playwright, /mobile:\s*\n\s*needs:\s*authenticated-editor/);
  for (const spec of [
    "tests/e2e/account-mobile.spec.js",
    "tests/e2e/troop-view.spec.js",
    "tests/e2e/mobile-combo-counter.spec.js",
    "tests/e2e/mobile-experience.spec.js"
  ]) {
    assert.match(playwright, new RegExp(spec.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
