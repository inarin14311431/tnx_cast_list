import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflow = await readFile(new URL("../.github/workflows/playwright.yml", import.meta.url), "utf8");

test("authenticated E2E includes showcase editor restore flow", () => {
  const authenticated = workflow.split("authenticated-editor:")[1]?.split("\n  mobile:")[0] || "";
  assert.match(authenticated, /tests\/e2e\/showcase-editor-restore\.spec\.js/);
});
