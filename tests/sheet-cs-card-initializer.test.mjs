import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/sheet-sidebar-actions.js", import.meta.url), "utf8");

test("sheet CS card uses an explicit idempotent initializer", () => {
  assert.match(source, /function initializeSheetCsCard\(\)/);
  assert.match(source, /root\.dataset\.tnxCsCardInitialized === '1'/);
  assert.match(source, /root\.dataset\.tnxCsCardInitialized = '1'/);
  assert.match(source, /initializeSheetCsCard\(\);/);
});

test("sheet CS card preserves its existing calculation and synchronization hooks", async () => {
  // The formula lives in the shared, DOM-free helper; the PC card feeds it the same inputs as before.
  const helper = await readFile(new URL("../js/sheet-ability-calculation.js", import.meta.url), "utf8");
  assert.match(helper, /Math\.floor\(\(toInteger\(reason\) \+ toInteger\(passion\) \+ toInteger\(life\)\) \/ 2\)/);
  assert.match(helper, /Math\.max\(0, base \+ normalizedModifier\)/);
  assert.match(helper, /storedBase: final - normalizedModifier/);
  assert.match(source, /import \{ calculateCombatSpeed \} from "\.\/sheet-ability-calculation\.js\?v=2";/);
  assert.match(source, /calculateCombatSpeed\(\{\s*reason: abilityValue\('reason'\),\s*passion: abilityValue\('passion'\),\s*life: abilityValue\('life'\),\s*modifier: toInteger\(modifierInput\.value\)\s*\}\)/);
  assert.match(source, /displayBase\.value = cs\.base;/);
  assert.match(source, /storedBase\.value = cs\.storedBase;/);
  assert.match(source, /modifierInput\.addEventListener\('change'/);
  assert.match(source, /document\.addEventListener\('input'/);
  assert.match(source, /document\.addEventListener\('change'/);
  assert.match(source, /new MutationObserver\(records =>/);
  assert.match(source, /observer\.observe\(abilityGrid, \{ childList: true, subtree: true \}\)/);
  assert.doesNotMatch(source, /observer\.observe\(document\.body/);
});
