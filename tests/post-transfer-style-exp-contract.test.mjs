import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("POST transfer maps style skill experience base by skill kind", async () => {
  const source = await read("js/tnx-direct-transfer-data.js");
  assert.match(source, /function styleSkillExpBase\(skill\)/);
  assert.match(source, /kind === "secret" \|\| kind === "秘技"\) return "20"/);
  assert.match(source, /kind === "ultimate" \|\| kind === "奥義"\) return "50"/);
  assert.match(source, /\["direction", "none", "演出", "なし"\]\.includes\(kind\)\) return "0"/);
  assert.match(source, /expbase: styleSkillExpBase\(skill\)/);
});
