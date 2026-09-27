import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const regression = await readFile(new URL("../.github/workflows/regression.yml", import.meta.url), "utf8");
const security = await readFile(new URL("../.github/workflows/security.yml", import.meta.url), "utf8");
const playwright = await readFile(new URL("../.github/workflows/playwright.yml", import.meta.url), "utf8");
const suites = JSON.parse(await readFile(new URL("./e2e/test-suites.json", import.meta.url), "utf8"));
const showcaseRestoreE2e = await readFile(new URL("./e2e/showcase-editor-restore.spec.js", import.meta.url), "utf8");

function assertSuiteContains(group, specs) {
  const tests = suites.groups?.[group]?.tests || [];
  for (const spec of specs) assert.ok(tests.includes(spec), `${group} must include ${spec}`);
}

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
    "npm run audit:migrations",
    "npm run audit:quality",
    "npm run audit:js-reachability",
    "npm run audit:e2e",
    "npm run audit:ci",
    "npm test"
  ]) {
    assert.match(regression, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(regression, /npm run audit:security/);
});

test("release candidate keeps security as an independent second gate", () => {
  assert.match(security, /npm run audit:security/);
});

test("release candidate keeps current public and authenticated editor E2E paths", () => {
  assert.match(playwright, /npm run e2e:ci-public/);
  assert.match(playwright, /npm run e2e:ci-editor/);
  assertSuiteContains("ci-public", [
    "tests/e2e/audit-public.spec.js",
    "tests/e2e/smoke.spec.js",
    "tests/e2e/cast-view.spec.js",
    "tests/e2e/troop-view.spec.js",
    "tests/e2e/editor-help.spec.js",
    "tests/e2e/direct-transfer.spec.js",
    "tests/e2e/character-sheet-url-import-live.spec.js"
  ]);
  assertSuiteContains("ci-editor", [
    "tests/e2e/audit-editor-health.spec.js",
    "tests/e2e/authenticated.spec.js",
    "tests/e2e/style-skill-detail-integrity.spec.js",
    "tests/e2e/skd-master-search.spec.js",
    "tests/e2e/troop-editor-flow.spec.js",
    "tests/e2e/showcase-editor-restore.spec.js"
  ]);
  assert.doesNotMatch(playwright, /E2E_REQUIRE_AUTH:\s*"1"/);
  assert.match(playwright, /E2E_EMAIL:\s*\$\{\{ secrets\.E2E_EMAIL \}\}/);
  assert.match(playwright, /E2E_PASSWORD:\s*\$\{\{ secrets\.E2E_PASSWORD \}\}/);
  assert.match(playwright, /E2E_CAST_ID:\s*\$\{\{ secrets\.E2E_CAST_ID \}\}/);
});

test("authenticated showcase restore E2E skips cleanly without credentials", () => {
  assert.match(showcaseRestoreE2e, /import \{ hasAuthCredentials \} from "\.\/helpers\.js";/);
  assert.match(showcaseRestoreE2e, /test\.beforeEach\(\(\) => \{\s*test\.skip\(!hasAuthCredentials\(\)/);
});

test("release candidate keeps critical mobile E2E paths independently runnable", () => {
  assert.doesNotMatch(playwright, /mobile:\s*\n\s*needs:\s*authenticated-editor/);
  assert.match(playwright, /npm run e2e:ci-mobile/);
  assertSuiteContains("ci-mobile", [
    "tests/e2e/account-mobile.spec.js",
    "tests/e2e/troop-view.spec.js",
    "tests/e2e/mobile-combo-counter.spec.js",
    "tests/e2e/mobile-experience.spec.js"
  ]);
});
