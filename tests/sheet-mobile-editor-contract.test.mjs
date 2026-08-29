import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../sheet-mobile.html", import.meta.url), "utf8");
const profileUi = await readFile(new URL("../js/sheet-mobile-profile.js", import.meta.url), "utf8");
const style = await readFile(new URL("../js/sheet-mobile-style.js", import.meta.url), "utf8");
const outfit = await readFile(new URL("../js/sheet-mobile-outfit.js", import.meta.url), "utf8");
const outfitUi = await readFile(new URL("../js/sheet-mobile-outfit-ui.js", import.meta.url), "utf8");
const combos = await readFile(new URL("../js/sheet-mobile-combos.js", import.meta.url), "utf8");
const ui = await readFile(new URL("../js/sheet-mobile-ui.js", import.meta.url), "utf8");

test("mobile editor keeps required sections and footer controls", () => {
  for (const id of [
    "mobile-profile",
    "mobile-styles-section",
    "mobile-ability-section",
    "mobile-general",
    "mobile-style-skills-section",
    "mobile-outfits-section",
    "mobile-view-link",
    "mobile-save"
  ]) assert.match(html, new RegExp(`id=["']${id}["']`));
});

test("mobile editor exposes a visible live save status", () => {
  assert.match(ui, /function ensureSaveStatus\(\)/);
  assert.match(ui, /status\.id="mobile-save-status"/);
  assert.match(ui, /status\.className="mobile-sheet-status"/);
  assert.match(ui, /setAttribute\("aria-live","polite"\)/);
});

test("mobile modal delete actions are promoted to the top without replacing feature delete handlers", () => {
  assert.match(ui, /function promoteDeleteAction\(source\)/);
  assert.match(ui, /body\.prepend\(proxy\)/);
  assert.match(ui, /proxy\._mobileDeleteSource\?\.click\(\)/);
  assert.match(ui, /source\.style\.display="none"/);
  assert.match(ui, /attributeFilter:\["hidden"\]/);
});

test("mobile general skill delete uses the same confirmation guard as other delete actions", () => {
  assert.match(ui, /function confirmGeneralDelete\(event\)/);
  assert.match(ui, /closest\?\.\("#mobile-general-delete"\)/);
  assert.match(ui, /confirm\(`「\$\{name\}」を削除しますか？`\)/);
  assert.match(ui, /stopImmediatePropagation\(\)/);
  assert.match(ui, /addEventListener\("click",confirmGeneralDelete,true\)/);
});

test("primary mobile edit dialogs provide explicit apply and cancel actions", () => {
  for (const source of [profileUi, style, outfitUi, combos]) {
    assert.match(source, /mobile-editor-dialog__header--actions/);
    assert.match(source, />キャンセル<\/button>/);
    assert.match(source, />反映<\/button>/);
  }
  assert.match(profileUi, /function cancelDialog\(\)/);
  assert.match(style, /function cancelEditor\(\)/);
  assert.match(outfit, /function cancelEditor\(\)/);
  assert.match(combos, /function cancelEditor\(\)/);
});

test("canceling a new outfit removes the transient row instead of leaving an empty unsaved item", () => {
  assert.match(outfit, /function addOutfit\(\)[\s\S]*outfits\.push\(item\);[\s\S]*openEditor\(item\.id\);/);
  assert.doesNotMatch(outfit.match(/function addOutfit\(\)[\s\S]*?\n}/)?.[0] || "", /markDirty\(\)/);
  assert.match(outfit, /if \(item\?\._new\)[\s\S]*outfits = outfits\.filter/);
  assert.match(outfit, /追加するアウトフィットは分類と名称を入力してください/);
});

test("canceling combo edits restores the pre-modal record and save indicator", () => {
  assert.match(combos, /activeOriginal=\{\.\.\.item\}/);
  assert.match(combos, /saveUiSnapshot=captureSaveUi\(\)/);
  assert.match(combos, /else if\(activeOriginal\)Object\.assign\(item,activeOriginal\)/);
  assert.match(combos, /restoreSaveUi\(saveUiSnapshot\)/);
  assert.match(combos, /dbPayload\(item\)/);
});
