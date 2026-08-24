import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/sheet-master-search-access.js", import.meta.url), "utf8");

test("master search access exposes an explicit idempotent initializer", () => {
  assert.match(source, /let masterSearchAccessInitialized = false;/);
  assert.match(source, /async function initializeSheetMasterSearchAccess\(\)/);
  assert.match(source, /if \(masterSearchAccessInitialized\) return;/);
  assert.match(source, /masterSearchAccessInitialized = true;/);
  assert.match(source, /void initializeSheetMasterSearchAccess\(\);/);
});

test("master search access preserves authorization and visibility behavior", () => {
  assert.match(source, /supabase\.rpc\("can_use_master_search"\)/);
  assert.match(source, /if \(data === true\)/);
  assert.match(source, /button\.hidden = false;/);
  assert.match(source, /button\.disabled = false;/);
  assert.match(source, /buttons\.forEach\(button => button\.remove\(\)\);/);
  assert.match(source, /dialog\?\.remove\(\);/);
});
