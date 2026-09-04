import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const bootstrap = await readFile(new URL("../js/privileged-tools-bootstrap.js", import.meta.url), "utf8");
const sheetTools = await readFile(new URL("../js/sheet-privileged-tools.js", import.meta.url), "utf8");

test("master search access is owned by the privileged bootstrap entry point", () => {
  assert.match(bootstrap, /void initializePrivilegedTools\(\);/);
  assert.match(bootstrap, /async function initializePrivilegedTools\(\)/);
  assert.match(bootstrap, /supabase\.auth\.getSession\(\)/);
  assert.match(bootstrap, /supabase\.rpc\("has_privileged_editor_tools"\)/);
  assert.match(bootstrap, /if \(error \|\| data !== true\) return;/);
  assert.match(bootstrap, /if \(page === "sheet\.html"\)/);
  assert.match(bootstrap, /import\("\.\/sheet-privileged-tools\.js\?v=\d+"\)/);
  assert.doesNotMatch(bootstrap, /can_use_master_search/);
});

test("sheet privileged tools install temporary anchors and then load master search modules", () => {
  assert.match(sheetTools, /const anchors = installSearchAnchors\(\)/);
  assert.match(sheetTools, /sheet-master-search\.js/);
  assert.match(sheetTools, /sheet-master-search-filters\.js/);
  assert.match(sheetTools, /sheet-master-search-enhancements\.js/);
  assert.match(sheetTools, /outfit-ofc-master-apply\.js/);
  assert.match(sheetTools, /anchors\.forEach\(anchor => anchor\.remove\(\)\)/);
  assert.doesNotMatch(sheetTools, /sheet-master-search-access/);
});
