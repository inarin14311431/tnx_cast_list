import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/general-master-skills.js", import.meta.url), "utf8");

test("general master skills uses an explicit idempotent initializer", () => {
  assert.match(source, /function initializeGeneralMasterSkills\(\)/);
  assert.match(source, /root\.dataset\.generalMasterSkillsInitialized\s*===\s*"1"/);
  assert.match(source, /root\.dataset\.generalMasterSkillsInitialized\s*=\s*"1"/);
  assert.match(source, /initializeGeneralMasterSkills\(\);/);
});

test("general master skills preserves delayed startup and ordering hooks", () => {
  assert.match(source, /setTimeout\(initializeGeneralMasterSkills,\s*80\)/);
  assert.match(source, /new MutationObserver\(queue\)/);
  assert.match(source, /observer\?\.observe\(root,\s*\{\s*childList:\s*true,\s*subtree:\s*true\s*\}\)/);
  assert.match(source, /window\.addEventListener\("tnx:general-master-ready",\s*queue\)/);
  assert.match(source, /requestAnimationFrame\(\(\)\s*=>\s*requestAnimationFrame\(arrange\)\)/);
  assert.match(source, /DOMContentLoaded",\s*initializeGeneralMasterSkills,\s*\{\s*once:\s*true\s*\}/);
});
