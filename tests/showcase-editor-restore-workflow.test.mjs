import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflow = await readFile(new URL("../.github/workflows/playwright.yml", import.meta.url), "utf8");
const suites = JSON.parse(await readFile(new URL("./e2e/test-suites.json", import.meta.url), "utf8"));

test("authenticated E2E includes showcase editor restore flow", () => {
  const authenticated = workflow.split("authenticated-editor:")[1]?.split("\n  mobile:")[0] || "";
  assert.match(authenticated, /npm run e2e:ci-editor/);
  assert.ok(
    suites.groups?.["ci-editor"]?.tests?.includes("tests/e2e/showcase-editor-restore.spec.js"),
    "ci-editor manifest must include showcase-editor-restore.spec.js"
  );
});
