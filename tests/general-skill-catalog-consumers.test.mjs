import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("PC editor consumes the shared general skill catalog instead of local master arrays", async () => {
  const source = await read("../js/sheet.js");
  assert.match(source, /GENERAL_MASTER_ROWS as GENERAL_MASTER, GENERAL_BLANK_SLOT_COLUMNS/);
  assert.match(source, /general-skill-catalog\.js\?v=1/);
  assert.doesNotMatch(source, /const GENERAL_MASTER = \[/);
  assert.doesNotMatch(source, /const GENERAL_BLANK_SLOT_COLUMNS = \[/);
});

test("mobile editor consumes shared general order and mutable prefixes", async () => {
  const source = await read("../js/sheet-mobile-skills.js");
  assert.match(source, /GENERAL_MOBILE_ORDER, MUTABLE_GENERAL_PREFIXES/);
  assert.match(source, /general-skill-catalog\.js\?v=1/);
  assert.doesNotMatch(source, /const PC_GENERAL_ORDER = \[/);
  assert.doesNotMatch(source, /const MUTABLE_GENERAL_PREFIXES = \[/);
  assert.match(source, /GENERAL_MOBILE_ORDER\.findIndex/);
});
