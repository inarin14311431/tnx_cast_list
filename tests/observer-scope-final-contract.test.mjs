import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const castViewMode = await read("js/cast-view-mode.js");
const mobileExp = await read("js/sheet-mobile-header-exp.js");
const troopCombo = await read("js/troop-combo-copy.js");

test("cast mobile readiness uses the mobile render event", () => {
  assert.match(castViewMode, /tnx:mobile-cast-rendered/);
  assert.match(castViewMode, /once: true/);
  assert.doesNotMatch(castViewMode, /MutationObserver/);
  assert.doesNotMatch(castViewMode, /\.observe\(/);
});

test("mobile experience observer is scoped to the mobile editor root", () => {
  assert.match(mobileExp, /const mobileRoot=document\.querySelector\("main"\)/);
  assert.match(mobileExp, /\.observe\(mobileRoot,\{childList:true,subtree:true,attributes:true,attributeFilter:\["data-state"\]\}\)/);
  assert.doesNotMatch(mobileExp, /\.observe\(document\.body,\{childList:true,subtree:true,attributes:true/);
});

test("troop combo observers are scoped to combo containers", () => {
  assert.match(troopCombo, /const COMBO_ROOT_SELECTOR = "\.cast-troop-combos, #troop-combos-view"/);
  assert.match(troopCombo, /document\.querySelectorAll\(COMBO_ROOT_SELECTOR\)\.forEach\(root =>/);
  assert.match(troopCombo, /\.observe\(root, \{ childList: true, subtree: true \}\)/);
  assert.doesNotMatch(troopCombo, /\.observe\(document\.body/);
});
