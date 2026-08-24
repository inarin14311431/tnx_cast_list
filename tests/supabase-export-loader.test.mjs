import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/supabase-client.js", import.meta.url), "utf8");

test("supabase client lazy-loads export modules without creating module cycles", () => {
  assert.doesNotMatch(source, /import\(\s*["']\.\/cocofolia-export\.js/);
  assert.doesNotMatch(source, /import\(\s*["']\.\/udonarium-export\.js/);
  assert.match(source, /script\.type\s*=\s*["']module["']/);
  assert.match(source, /loadModuleScript\(["']\.\/js\/cocofolia-export\.js\?v=2["']/);
  assert.match(source, /loadModuleScript\(["']\.\/js\/udonarium-export\.js\?v=1["']/);
});

test("export module loader is idempotent per script id", () => {
  assert.match(source, /document\.getElementById\(id\)/);
  assert.match(source, /script\.id\s*=\s*id/);
});
