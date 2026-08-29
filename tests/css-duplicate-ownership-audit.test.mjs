import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const audit = await readFile(new URL("../scripts/audit-css-rebuild.mjs", import.meta.url), "utf8");

test("CSS architecture audit rejects duplicate non-empty stylesheet ownership", () => {
  assert.match(audit, /const cssContentOwners = new Map\(\)/);
  assert.match(audit, /const contentKey = source\.trim\(\)/);
  assert.match(audit, /duplicates stylesheet content owned by/);
  assert.match(audit, /cssContentOwners\.set\(contentKey, relative\(file\)\)/);
});
