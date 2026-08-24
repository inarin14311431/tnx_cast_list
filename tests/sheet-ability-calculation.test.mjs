import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  calculateFinalValue,
  calculateAbilityFinals
} from "../js/sheet-ability-calculation.js";

const ABILITIES = [["reason"], ["passion"], ["life"], ["mundane"]];

test("final value preserves current plus positive, zero and negative modifiers", () => {
  assert.equal(calculateFinalValue("3", "2"), 5);
  assert.equal(calculateFinalValue(4, -1), 3);
  assert.equal(calculateFinalValue("", ""), 0);
  assert.equal(calculateFinalValue(0, -2), -2);
});

test("ability final calculation covers ability, control and CS values", () => {
  const result = calculateAbilityFinals({
    abilities: ABILITIES,
    values: {
      reason: { current: 3, modifier: 2, controlCurrent: 4, controlModifier: -1 },
      passion: { current: 1, modifier: -2, controlCurrent: 5, controlModifier: 3 },
      life: { current: 0, modifier: 4, controlCurrent: 0, controlModifier: 0 },
      mundane: { current: 7, modifier: -3, controlCurrent: 2, controlModifier: 2 }
    },
    cs: { current: 9, modifier: -2 }
  });

  assert.deepEqual(result, {
    reason: 5, "reason-control": 3,
    passion: -1, "passion-control": 8,
    life: 4, "life-control": 0,
    mundane: 4, "mundane-control": 4,
    cs: 7
  });
});

test("missing ability values default to zero", () => {
  assert.deepEqual(calculateAbilityFinals({ abilities: ABILITIES }), {
    reason: 0, "reason-control": 0,
    passion: 0, "passion-control": 0,
    life: 0, "life-control": 0,
    mundane: 0, "mundane-control": 0,
    cs: 0
  });
});

test("ability calculation stays DOM-free and classic sheet delegates recalc math", async () => {
  const helperSource = await readFile(new URL("../js/sheet-ability-calculation.js", import.meta.url), "utf8");
  const sheetSource = await readFile(new URL("../js/sheet.js", import.meta.url), "utf8");

  assert.doesNotMatch(helperSource, /document\.|window\.|supabase|localStorage|sessionStorage|addEventListener/);
  assert.match(sheetSource, /sheet-ability-calculation\.js\?v=1/);
  assert.match(sheetSource, /calculateAbilityFinals\(/);
  assert.doesNotMatch(sheetSource, /function final\(/);
  assert.match(sheetSource, /TNXExperience\?\.queue\?\.\(\)/);
});
