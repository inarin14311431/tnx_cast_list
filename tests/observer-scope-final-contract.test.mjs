import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const castViewMode = await read("js/cast-view-mode.js");
const mobileExp = await read("js/sheet-mobile-header-exp.js");
const troopCombo = await read("js/troop-combo-copy.js");

test("cast mobile readiness observer is scoped to the mobile cast root", () => {
  assert.match(castViewMode, /const mobileRoot = document\.querySelector\("#mobile-cast-view"\)/);
  assert.match(castViewMode, /observer\.observe\(mobileRoot, \{ childList: true, subtree: true \}\)/);
  assert.doesNotMatch(castViewMode, /observer\.observe\(document\.body/);
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
