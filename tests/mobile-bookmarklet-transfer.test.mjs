import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("mobile transfer helper uses bookmarklet and clipboard flow without direct POST", async () => {
  const [html, controller] = await Promise.all([
    read("mobile-transfer.html"),
    read("js/mobile-bookmarklet-transfer.js")
  ]);

  assert.match(html, /MOBILE TRANSFER/);
  assert.match(html, /mobile-transfer-bookmarklet-slot/);
  assert.match(html, /character-sheets\.appspot\.com\/tnx\/edit\.html/);
  assert.doesNotMatch(html, /character-sheets\.appspot\.com\/tnx\/register/);
  assert.doesNotMatch(controller, /fetch\s*\(.*character-sheets/);
  assert.match(controller, /transfer-tsv-export\.js/);
});

test("production transfer router keeps desktop and mobile on bookmarklet flow", async () => {
  const router = await read("js/direct-transfer-button.js");

  assert.match(router, /ACTIVE_MODE = "bookmarklet"/);
  assert.match(router, /removeInactivePostTriggers/);
  assert.match(router, /mobile-transfer\.html\?id=/);
  assert.match(router, /transfer-tsv-export\.js\?v=1/);
  assert.doesNotMatch(router, /direct-transfer-button-post\.js/);
});

test("bookmarklet retains paste fallback for mobile clipboard restrictions", async () => {
  const bookmarklet = await read("js/tnx-transfer-bookmarklet.js");

  assert.match(bookmarklet, /navigator\.clipboard\.readText/);
  assert.match(bookmarklet, /prompt\("転記TSVを貼り付けてください。"/);
  assert.match(bookmarklet, /TNX_CAST_TRANSFER_TSV/);
});
