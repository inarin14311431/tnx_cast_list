import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const accountSource = await readFile(new URL("../js/account.js", import.meta.url), "utf8");
const formatterSource = await readFile(new URL("../js/archive-id-code.js", import.meta.url), "utf8");

function loadFormatter() {
  const context = { window: {} };
  vm.runInNewContext(formatterSource, context);
  return context.window.TNXArchiveId;
}

test("account uses the shared archive display formatter", () => {
  assert.match(accountSource, /import\s+["']\.\/archive-id-code\.js\?v=1["']/);
  assert.match(accountSource, /const displayId = window\.TNXArchiveId\.format\(character\.public_id\)/);
  assert.match(accountSource, /const displayId = window\.TNXArchiveId\.format\(publicId\)/);
  assert.doesNotMatch(accountSource, /function\s+obfuscatePublicId\s*\(/);
});

test("legacy and random public IDs both map to the common visible shape", () => {
  const formatter = loadFormatter();
  for (const sourceId of [
    "TNX-000091",
    "TNX-0123456789ABCDEF0123456789ABCDEF"
  ]) {
    const displayId = formatter.format(sourceId);
    assert.match(displayId, /^TNX-[23456789A-HJ-NP-Z]{4}-[23456789A-HJ-NP-Z]{4}$/);
    assert.equal(displayId, formatter.format(sourceId));
  }
});

test("account keeps raw public IDs for URLs and database operations", () => {
  assert.match(accountSource, /const id = encodeURIComponent\(character\.public_id\)/);
  assert.match(accountSource, /cast\.html\?id=\$\{id\}/);
  assert.match(accountSource, /sheet\.html\?id=\$\{id\}/);
  assert.match(accountSource, /sheet-mobile\.html\?id=\$\{id\}/);
  assert.match(accountSource, /acts\.html\?character=\$\{id\}/);
  assert.match(accountSource, /\.eq\("public_id", publicId\)/);
});
