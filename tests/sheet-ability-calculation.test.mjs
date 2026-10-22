import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  calculateFinalValue,
  calculateAbilityFinals
} from "../js/sheet-ability-calculation.js";
import { assertVersionedMatch } from "./helpers/cache-version.mjs";

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
  assertVersionedMatch(sheetSource, /sheet-ability-calculation\.js\?v=VERSION/);
  assert.match(sheetSource, /calculateAbilityFinals\(/);
  assert.doesNotMatch(sheetSource, /function final\(/);
  assert.match(sheetSource, /TNXExperience\?\.queue\?\.\(\)/);
});

test("CS: base is floor((reason + passion + life) / 2), final is clamped at 0, stored base keeps cs_base + cs_gear === final", async () => {
  const { calculateCombatSpeed } = await import("../js/sheet-ability-calculation.js");
  assert.deepEqual(calculateCombatSpeed({ reason: 5, passion: 4, life: 6, modifier: 0 }), { base: 7, modifier: 0, final: 7, storedBase: 7 });
  assert.deepEqual(calculateCombatSpeed({ reason: 5, passion: -1, life: 4, modifier: -2 }), { base: 4, modifier: -2, final: 2, storedBase: 4 });
  // Odd sums round down, including negative sums.
  assert.equal(calculateCombatSpeed({ reason: 1, passion: 1, life: 1 }).base, 1);
  assert.equal(calculateCombatSpeed({ reason: -3, passion: 0, life: 0 }).base, -2);
  // Clamped final: stored base is chosen so that cs_base + cs_gear still equals the shown final.
  const clamped = calculateCombatSpeed({ reason: 1, passion: 0, life: 0, modifier: -3 });
  assert.deepEqual(clamped, { base: 0, modifier: -3, final: 0, storedBase: 3 });
  assert.equal(clamped.storedBase + clamped.modifier, clamped.final);
  // Non-numeric input is treated as 0, decimals are truncated like the PC card.
  assert.deepEqual(calculateCombatSpeed({ reason: "x", passion: 2.9, life: "4", modifier: "1.7" }), { base: 3, modifier: 1, final: 4, storedBase: 3 });
});

test("PC and mobile CS feed the shared helper the same inputs and save the same fields", async () => {
  const pc = await readFile(new URL("../js/sheet-sidebar-actions.js", import.meta.url), "utf8");
  const mobile = await readFile(new URL("../js/sheet-mobile-ability.js", import.meta.url), "utf8");
  const payload = await readFile(new URL("../js/sheet-save-payload.js", import.meta.url), "utf8");
  // PC: ability value = #key-base + #key-mod (current + gear + manual as loaded); modifier = #cs-mod (cs_gear + cs_manual).
  assert.match(pc, /const base = toInteger\(document\.querySelector\(`#\$\{key\}-base`\)\?\.value\);\s*const modifier = toInteger\(document\.querySelector\(`#\$\{key\}-mod`\)\?\.value\);\s*return base \+ modifier;/);
  // Mobile: the same current + gear + manual, modifier = cs_gear + cs_manual.
  assert.match(mobile, /return num\(character\[`\$\{key\}_base`\]\) \+ num\(character\[`\$\{key\}_gear`\]\) \+ num\(character\[`\$\{key\}_manual`\]\);/);
  assert.match(mobile, /return num\(character\.cs_gear\) \+ num\(character\.cs_manual\);/);
  assert.match(mobile, /calculateCombatSpeed\(\{\s*reason: abilityTotal\("reason"\),\s*passion: abilityTotal\("passion"\),\s*life: abilityTotal\("life"\),\s*modifier\s*\}\)/);
  // Saved fields: PC writes cs_base = stored base, cs_gear = modifier, cs_manual = 0, cs = cs_base + cs_gear.
  assert.match(payload, /payload\.cs_manual = 0;\s*payload\.cs = payload\.cs_base \+ payload\.cs_gear;/);
  assert.match(mobile, /character\.cs_base = cs\.storedBase;\s*character\.cs_gear = cs\.modifier;\s*character\.cs_manual = 0;\s*character\.cs = cs\.final;/);
  // Mobile dialog: base is read-only, only the modifier is editable.
  const html = await readFile(new URL("../sheet-mobile.html", import.meta.url), "utf8");
  assert.match(html, /<label>基礎値<input data-mobile-cs-input="base" type="number" readonly tabindex="-1" aria-readonly="true"><\/label>/);
  assert.doesNotMatch(mobile, /\["base", "mod"\]\.forEach/);
  // Opening the editor must not mark it dirty; a disagreeing stored CS is written on the next save.
  assert.match(mobile, /csNeedsPersist = applyCombatSpeed\(\);\s*renderSummary\(\);/);
  assert.match(mobile, /if \(abilityDirty \|\| csNeedsPersist\) event\.detail\.add\(flushAbility\(\)\);/);
});
