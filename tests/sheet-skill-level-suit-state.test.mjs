import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  normalizeSkillLevel,
  normalizeSkillFreeLevel,
  shouldSelectAllSuits,
  resolveSkillLevelAfterSuitChange,
  resolveSkillInputState
} from "../js/sheet-skill-level-suit-state.js";

test("skill level normalization clamps negative and blank values", () => {
  assert.equal(normalizeSkillLevel(-2), 0);
  assert.equal(normalizeSkillLevel(""), 0);
  assert.equal(normalizeSkillLevel("3"), 3);
});

test("free level stays between zero and the current skill level", () => {
  assert.equal(normalizeSkillFreeLevel(2, 3), 2);
  assert.equal(normalizeSkillFreeLevel(5, 3), 3);
  assert.equal(normalizeSkillFreeLevel(-2, 3), 0);
  assert.equal(normalizeSkillFreeLevel("2", "4"), 2);
  assert.equal(normalizeSkillFreeLevel(3, 0), 0);
});

test("level four or higher selects all suits", () => {
  assert.equal(shouldSelectAllSuits(3), false);
  assert.equal(shouldSelectAllSuits(4), true);
  assert.equal(shouldSelectAllSuits("5"), true);
});

test("adding suits raises level only when selected count exceeds it", () => {
  assert.equal(resolveSkillLevelAfterSuitChange({ currentLevel: 1, selectedSuitCount: 2, checked: true }), 2);
  assert.equal(resolveSkillLevelAfterSuitChange({ currentLevel: 3, selectedSuitCount: 2, checked: true }), 3);
});

test("removing a suit lowers level to the remaining selected count", () => {
  assert.equal(resolveSkillLevelAfterSuitChange({ currentLevel: 4, selectedSuitCount: 3, checked: false }), 3);
  assert.equal(resolveSkillLevelAfterSuitChange({ currentLevel: 2, selectedSuitCount: 0, checked: false }), 0);
});

test("unified skill input state keeps level and free level consistent", () => {
  assert.deepEqual(resolveSkillInputState({
    action: "suit", currentLevel: 1, currentFreeLevel: 1, selectedSuitCount: 2, checked: true
  }), { level: 2, freeLevel: 1 });
  assert.deepEqual(resolveSkillInputState({
    action: "suit", currentLevel: 4, currentFreeLevel: 4, selectedSuitCount: 2, checked: false
  }), { level: 2, freeLevel: 2 });
  assert.deepEqual(resolveSkillInputState({
    action: "level", value: 1, currentLevel: 4, currentFreeLevel: 3
  }), { level: 1, freeLevel: 1 });
  assert.deepEqual(resolveSkillInputState({
    action: "free_level", value: 5, currentLevel: 3, currentFreeLevel: 0
  }), { level: 3, freeLevel: 3 });
});

test("helper remains DOM-free and both DOM layers use the unified state resolver", async () => {
  const helperSource = await readFile(new URL("../js/sheet-skill-level-suit-state.js", import.meta.url), "utf8");
  const domSource = await readFile(new URL("../js/skill-level-suit-rules.js", import.meta.url), "utf8");
  const sheetSource = await readFile(new URL("../js/sheet.js", import.meta.url), "utf8");
  assert.doesNotMatch(helperSource, /document\.|window\.|supabase|localStorage|sessionStorage|addEventListener/);
  assert.match(domSource, /sheet-skill-level-suit-state\.js\?v=1/);
  assert.match(domSource, /resolveSkillInputState/);
  assert.match(domSource, /shouldSelectAllSuits/);
  assert.match(domSource, /action:\"level\"/);
  assert.match(domSource, /action:\"suit\"/);
  assert.match(domSource, /action:\"free_level\"/);
  assert.match(sheetSource, /sheet-skill-level-suit-state\.js\?v=1/);
  assert.match(sheetSource, /resolveSkillInputState/);
  assert.doesNotMatch(sheetSource, /skill\.level\s*=\s*Math\.max\(Number\(skill\.level/);
  assert.doesNotMatch(sheetSource, /skill\.free_level\s*=\s*Math\.min\(Math\.max\(Number\(skill\.free_level/);
});
