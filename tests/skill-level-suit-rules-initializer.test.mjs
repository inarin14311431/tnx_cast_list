import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const ROOT = process.cwd();
const source = fs.readFileSync(path.join(ROOT, "js", "skill-level-suit-rules.js"), "utf8");

test("skill level suit rules has an explicit idempotent delegated initializer", () => {
  assert.match(source, /function\s+initializeSkillLevelSuitRules\s*\(/);
  assert.match(source, /dataset\.levelSuitRulesObserver===\"1\"/);
  assert.match(source, /dataset\.levelSuitRulesObserver=\"1\"/);
  assert.match(source, /root\.addEventListener\(\"input\",handleInput\)/);
  assert.match(source, /initializeSkillLevelSuitRules\(\);/);
});

test("skill level suit rules delegates level, suit and free-level decisions", () => {
  assert.match(source, /sheet-skill-level-suit-state\.js\?v=1/);
  assert.match(source, /normalizeSkillLevel/);
  assert.match(source, /shouldSelectAllSuits/);
  assert.match(source, /resolveSkillInputState/);
  assert.match(source, /action:\"level\"/);
  assert.match(source, /action:\"suit\"/);
  assert.match(source, /action:\"free_level\"/);
  assert.match(source, /box\.checked=true/);
  assert.match(source, /selectedSuitCount:selectedCount\(row\)/);
  assert.match(source, /checked:control\.checked/);
  assert.match(source, /dispatchInput\(level\)/);
  assert.match(source, /dispatchInput\(freeLevel\)/);
  assert.match(source, /setTimeout\(initializeSkillLevelSuitRules,100\)/);
});

test("skill level suit rules no longer depends on per-row oninput ownership", () => {
  assert.doesNotMatch(source, /typeof\s+level\.oninput/);
  assert.doesNotMatch(source, /originalSuitHandlers/);
  assert.doesNotMatch(source, /MutationObserver/);
});
