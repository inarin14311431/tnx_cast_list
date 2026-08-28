import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("normal pages do not advertise privileged master tools", async () => {
  const [sheetHtml, accountHtml] = await Promise.all([
    read("sheet.html"),
    read("account.html")
  ]);

  for (const source of [sheetHtml, accountHtml]) {
    assert.doesNotMatch(source, /SKD|OFC/);
    assert.doesNotMatch(source, /sheet-master-search|sheet-master-autofill|master-data-admin|master-user-delete|tsv-import-guide/);
  }

  assert.match(sheetHtml, /privileged-tools-bootstrap\.js/);
  assert.match(accountHtml, /privileged-tools-bootstrap\.js/);
});

test("generic bootstrap does not disclose the protected feature", async () => {
  const bootstrap = await read("js/privileged-tools-bootstrap.js");
  assert.match(bootstrap, /has_privileged_editor_tools/);
  assert.doesNotMatch(bootstrap, /SKD|OFC|skd_master|ofc_master|master_search_users|can_use_master_search/);
});

test("core editor has no privileged import controls", async () => {
  const sheet = await read("js/sheet.js");
  assert.doesNotMatch(sheet, /import-skd|import-ofc|search-skd-master|search-ofc-master/);
  assert.doesNotMatch(sheet, /SKD TSV|OFC TSV/);
  assert.match(sheet, /openTsvImport/);
});

test("privileged editor module owns master controls", async () => {
  const privileged = await read("js/sheet-privileged-tools.js");
  assert.match(privileged, /SKD TSV取込/);
  assert.match(privileged, /OFC TSV取込/);
  assert.match(privileged, /sheet-master-search\.js/);
});
