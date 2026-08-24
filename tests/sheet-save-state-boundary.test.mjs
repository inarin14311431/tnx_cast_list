import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const stateSource = await readFile(new URL("../js/sheet-save-state.js", import.meta.url), "utf8");
const featureSource = await readFile(new URL("../js/sheet-features.js", import.meta.url), "utf8");
const snapshotSource = await readFile(new URL("../js/sheet-snapshots.js", import.meta.url), "utf8");
const diagnosticsSource = await readFile(new URL("../js/sheet-save-diagnostics.js", import.meta.url), "utf8");
const imageSource = await readFile(new URL("../js/sheet-image.js", import.meta.url), "utf8");
const sheetHtmlSource = await readFile(new URL("../sheet.html", import.meta.url), "utf8");
const ofcSaveSource = await readFile(new URL("../js/outfit-ofc-save.js", import.meta.url), "utf8");

test("PC save presentation is driven by one explicit shared state store", () => {
  assert.match(stateSource, /const STATE_EVENT = "tnx:sheet-save-state"/);
  assert.match(stateSource, /export function setSheetSaveState/);
  assert.match(stateSource, /function renderSheetSaveState/);
  assert.match(stateSource, /globalThis\.TNXSheetSaveState/);
  assert.doesNotMatch(stateSource, /new MutationObserver/);
  assert.doesNotMatch(stateSource, /classList\.contains\("error"\)/);
  assert.doesNotMatch(stateSource, /\/エラー\|失敗\//);
  assert.match(featureSource, /import "\.\/sheet-save-state\.js\?v=2"/);
  assert.doesNotMatch(featureSource, /function initializeSaveButtonState/);
});

test("all PC save-state consumers share the current cache boundary", () => {
  assert.match(snapshotSource, /sheet-save-state\.js\?v=2/);
  assert.match(diagnosticsSource, /sheet-save-state\.js\?v=2/);
  assert.match(imageSource, /sheet-save-state\.js\?v=2/);
  assert.doesNotMatch(featureSource + snapshotSource + diagnosticsSource + imageSource, /sheet-save-state\.js\?v=1/);
});

test("snapshot unsaved guard consumes shared save state instead of parsing save DOM", () => {
  assert.match(snapshotSource, /hasUnsavedSheetChanges/);
  assert.match(snapshotSource, /focusSheetSaveButton/);
  assert.doesNotMatch(snapshotSource, /function hasUnsavedChanges/);
  assert.doesNotMatch(snapshotSource, /querySelector\("#save-status"\)/);
  assert.doesNotMatch(snapshotSource, /querySelector\("#save-button"\)\?\.focus/);
});

test("save diagnostics consumes shared lifecycle and structured error events without patching Supabase", () => {
  assert.match(diagnosticsSource, /tnx:sheet-save-state/);
  assert.match(diagnosticsSource, /tnx:sheet-save-error/);
  assert.match(diagnosticsSource, /observeSaveError/);
  assert.match(diagnosticsSource, /refreshFromState/);
  assert.doesNotMatch(diagnosticsSource, /function patchSaveRpc/);
  assert.doesNotMatch(diagnosticsSource, /supabase-client\.js/);
  assert.doesNotMatch(diagnosticsSource, /supabase\.rpc\s*=/);
  assert.doesNotMatch(diagnosticsSource, /__tnxSaveDiagnosticsPatched/);
  assert.doesNotMatch(diagnosticsSource, /new MutationObserver/);
  assert.doesNotMatch(diagnosticsSource, /querySelector\('#save-status'\)/);
});

test("retired manual-save watchdog is not part of the sheet runtime", () => {
  assert.doesNotMatch(sheetHtmlSource, /sheet-save-watchdog\.js/);
});

test("PC OFC save derives modifier validity from canonical contract", () => {
  assert.match(ofcSaveSource, /outfitSupportsControl/);
  assert.match(ofcSaveSource, /outfitSupportsCsModifier/);
  assert.doesNotMatch(ofcSaveSource, /category === "armor" \|\| category === "vehicle"/);
  assert.doesNotMatch(ofcSaveSource, /category === "tron" \|\| category === "vehicle"/);
});
