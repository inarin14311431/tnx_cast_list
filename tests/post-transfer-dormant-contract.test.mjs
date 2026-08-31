import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("POST transfer implementation remains available but inactive", async () => {
  const [router, adapter, transferPage, transferScript] = await Promise.all([
    read("js/direct-transfer-button.js"),
    read("js/direct-transfer-button-post.js"),
    read("transfer.html"),
    read("js/transfer.js")
  ]);

  assert.match(router, /ACTIVE_MODE = "bookmarklet"/);
  assert.match(router, /DORMANT_POST_ADAPTER = "\.\/direct-transfer-button-post\.js\?v=3"/);
  assert.doesNotMatch(router, /import\s*\(\s*DORMANT_POST_ADAPTER\s*\)/);
  assert.match(adapter, /transfer\.html\?embed=1/);
  assert.match(transferPage, /id="transfer-form"/);
  assert.match(transferScript, /outbound\.method = "POST"/);
});
