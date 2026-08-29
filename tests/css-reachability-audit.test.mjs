import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const audit = await readFile(new URL("../scripts/audit-css-rebuild.mjs", import.meta.url), "utf8");

test("CSS architecture audit traces production roots through imports", () => {
  assert.match(audit, /const cssRoots = new Set\(\)/);
  assert.match(audit, /const reachableCss = new Set\(\)/);
  assert.match(audit, /@import\\s\+/);
  assert.match(audit, /pendingCss\.push\(importedFile\)/);
});

test("CSS architecture audit rejects unreachable and missing local stylesheets", () => {
  assert.match(audit, /missing stylesheet/);
  assert.match(audit, /missing imported stylesheet/);
  assert.match(audit, /stylesheet is unreachable from production HTML roots/);
});
