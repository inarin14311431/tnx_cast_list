import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const bootstrap = await readFile(new URL("../js/privileged-tools-bootstrap.js", import.meta.url), "utf8");
const sheetTools = await readFile(new URL("../js/sheet-privileged-tools.js", import.meta.url), "utf8");

test("privileged tools authenticate and authorize before loading any editor tools", () => {
  const sessionIndex = bootstrap.indexOf("supabase.auth.getSession()");
  const rpcIndex = bootstrap.indexOf('supabase.rpc("has_privileged_editor_tools")');
  const sheetImportIndex = bootstrap.indexOf('import("./sheet-privileged-tools.js?v=1")');

  assert.ok(sessionIndex >= 0);
  assert.ok(rpcIndex > sessionIndex);
  assert.ok(sheetImportIndex > rpcIndex);
  assert.match(bootstrap, /if \(sessionError \|\| !session\) return;/);
  assert.match(bootstrap, /if \(error \|\| data !== true\) return;/);
});

test("privileged sheet tools are fail-closed and do not contain authorization fallbacks", () => {
  assert.match(sheetTools, /sheet-master-search\.js/);
  assert.match(sheetTools, /sheet-master-search-enhancements\.js/);
  assert.match(sheetTools, /outfit-ofc-master-apply\.js/);
  assert.doesNotMatch(sheetTools, /has_privileged_editor_tools|can_use_master_search|user\.email|allowedEmails/);
});

test("privileged bootstrap degrades safely when authorization infrastructure fails", () => {
  assert.match(bootstrap, /catch \(error\)/);
  assert.match(bootstrap, /console\.warn\("Privileged tools are unavailable\."/);
  assert.doesNotMatch(bootstrap, /catch[^}]*import\(/s);
});
