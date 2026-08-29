import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const audit = await readFile(new URL("../scripts/audit-css-rebuild.mjs", import.meta.url), "utf8");

test("CSS audit masks comments and strings before selector parsing", () => {
  assert.match(audit, /function maskCssCommentsAndStrings\(source\)/);
  assert.match(audit, /state === "comment"/);
  assert.match(audit, /state === "string"/);
});

test("CSS audit rejects duplicate selectors only within the same at-rule context", () => {
  assert.match(audit, /function collectContextualSelectors\(source\)/);
  assert.match(audit, /filter\(item => item\.type === "at-rule"\)/);
  assert.match(audit, /const key = `\$\{context\}\\u0000\$\{selector\}`/);
  assert.match(audit, /duplicate selector/);
});
