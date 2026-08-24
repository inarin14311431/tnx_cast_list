import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/style-skill-separators.js", import.meta.url), "utf8");

test("style separator add button uses an explicit idempotent initializer", () => {
  assert.match(source, /function initializeStyleSkillSeparators\(\)/);
  assert.match(source, /toolbar\.dataset\.styleSkillSeparatorsInitialized===\"1\"/);
  assert.match(source, /toolbar\.dataset\.styleSkillSeparatorsInitialized=\"1\"/);
  assert.match(source, /initializeStyleSkillSeparators\(\);/);
});

test("style separator initializer preserves existing add-button behavior", () => {
  assert.match(source, /button\.id=\"add-style-separator\"/);
  assert.match(source, /toolbar\.classList\.add\(\"has-style-divider\"\)/);
  assert.match(source, /button\.onclick=\(\)=>window\.TNXSheetEditor\?\.addStyleSeparator\?\.\(\)/);
});
