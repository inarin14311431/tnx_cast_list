import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const ROOT = process.cwd();
const source = fs.readFileSync(path.join(ROOT, "js", "sheet-sidebar-actions.js"), "utf8");

test("sheet sidebar actions have an explicit idempotent initializer", () => {
  assert.match(source, /function\s+initializeSheetSidebarActions\s*\(/);
  assert.match(source, /panel\.dataset\.tnxSidebarActionsInitialized\s*===\s*['"]1['"]/);
  assert.match(source, /panel\.dataset\.tnxSidebarActionsInitialized\s*=\s*['"]1['"]/);
  assert.match(source, /initializeSheetSidebarActions\(\);/);
});

test("sheet sidebar actions keep their existing arrangement hooks", () => {
  assert.match(source, /VIEWER_ONLY_ACTION/);
  assert.match(source, /reorderActions/);
  assert.match(source, /classifyActions/);
  assert.match(source, /window\.addEventListener\(['"]load['"],\s*queueArrange/);
  assert.match(source, /new MutationObserver\(queueArrange\)\.observe\(panel/);
});
