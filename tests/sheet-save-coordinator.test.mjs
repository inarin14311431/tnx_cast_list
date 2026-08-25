import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sheetSource = await readFile(new URL("../js/sheet.js", import.meta.url), "utf8");
const coordinatorSource = await readFile(new URL("../js/sheet-save-coordinator.js", import.meta.url), "utf8");
const stateSource = await readFile(new URL("../js/sheet-save-state.js", import.meta.url), "utf8");
const persistenceSource = await readFile(new URL("../js/sheet-save-persistence.js", import.meta.url), "utf8");
const payloadSource = await readFile(new URL("../js/sheet-save-payload.js", import.meta.url), "utf8");

test("classic sheet delegates save lifecycle state to the coordinator", () => {
  assert.match(sheetSource, /createSheetSaveCoordinator/);
  assert.match(sheetSource, /saveCoordinator\.save\(true\)/);
  assert.match(sheetSource, /saveCoordinator\.markDirty\(\)/);
  assert.match(sheetSource, /saveCoordinator\.markLoading/);
  assert.match(sheetSource, /saveCoordinator\.markSaved\(\)/);
  assert.match(sheetSource, /saveCoordinator\.markLoadError/);
  assert.match(sheetSource, /saveCoordinator\.hasUnsavedChanges\(\)/);
  assert.doesNotMatch(sheetSource, /let dirty\s*=/);
  assert.doesNotMatch(sheetSource, /let saving\s*=/);
  assert.doesNotMatch(sheetSource, /let pending\s*=/);
  assert.doesNotMatch(sheetSource, /function saveAll\s*\(/);
  assert.doesNotMatch(sheetSource, /function setStatus\s*\(/);
  assert.doesNotMatch(sheetSource, /function pulse\s*\(/);
});

test("save coordinator owns dirty, saving and queued-save mechanics", () => {
  assert.match(coordinatorSource, /let dirty = false/);
  assert.match(coordinatorSource, /let saving = false/);
  assert.match(coordinatorSource, /let pending = false/);
  assert.match(coordinatorSource, /async function save\(force = false\)/);
  assert.match(coordinatorSource, /if \(saving\) \{[\s\S]*pending = true/);
  assert.match(coordinatorSource, /queueMicrotask\(\(\) => save\(false\)\)/);
});

test("retired legacy load bridge is absent from the generic save coordinator", () => {
  assert.doesNotMatch(coordinatorSource, /sheet-legacy-outfit-compat/);
  assert.doesNotMatch(coordinatorSource, /installLegacyOutfitCompatibility/);
  assert.doesNotMatch(coordinatorSource, /HYDRATION_/);
  assert.doesNotMatch(coordinatorSource, /MutationObserver/);
  assert.doesNotMatch(coordinatorSource, /isTrusted/);
});

test("edits made during an in-flight save stay dirty and queue a follow-up save", () => {
  assert.match(coordinatorSource, /let changeRevision = 0/);
  assert.match(coordinatorSource, /changeRevision \+= 1/);
  assert.match(coordinatorSource, /if \(saving\) \{[\s\S]*pending = true;[\s\S]*return;/);
  assert.match(coordinatorSource, /const revisionAtStart = changeRevision/);
  assert.match(coordinatorSource, /const changedWhileSaving = changeRevision !== revisionAtStart/);
  assert.match(coordinatorSource, /dirty = changedWhileSaving/);
  assert.match(coordinatorSource, /if \(changedWhileSaving\) pending = true/);
});

test("clean queued saves do not perform a redundant persistence call", () => {
  assert.match(coordinatorSource, /if \(!dirty\) \{[\s\S]*if \(force\) markSaved\(\);[\s\S]*return true;/);
});

test("save coordinator publishes lifecycle through the shared state store", () => {
  assert.match(coordinatorSource, /sheet-save-state\.js\?v=2/);
  assert.match(coordinatorSource, /setSheetSaveState/);
  assert.match(coordinatorSource, /function publish\(state, text = ""\)/);
  assert.doesNotMatch(coordinatorSource, /querySelector\("#save-status"\)/);
  assert.doesNotMatch(coordinatorSource, /STATUS_SELECTOR/);
});

test("save coordinator publishes structured errors without diagnostics intercepting RPC", () => {
  assert.match(coordinatorSource, /const SAVE_ERROR_EVENT = "tnx:sheet-save-error"/);
  assert.match(coordinatorSource, /function publishError\(error, text\)/);
  assert.match(coordinatorSource, /detail: \{ error, text: String\(text \|\| ""\) \}/);
  assert.match(coordinatorSource, /publishError\(error, text\);[\s\S]*publish\("error", text\)/);
});

test("shared save requests call the coordinator directly instead of clicking the save button", () => {
  assert.match(coordinatorSource, /registerSheetSaveRequester/);
  assert.match(coordinatorSource, /registerSheetSaveRequester\(\(\) => save\(true\)\)/);
  assert.match(stateSource, /export function registerSheetSaveRequester/);
  assert.match(stateSource, /return saveRequester\(\)/);
  assert.doesNotMatch(stateSource, /button\.click\(\)/);
});

test("classic editor routes DB-shaped serialization through the payload contract", () => {
  assert.match(sheetSource, /sheet-save-payload\.js\?v=1/);
  assert.match(sheetSource, /buildCharacterSavePayload\(/);
  assert.match(sheetSource, /buildSkillSavePayloads\(skills/);
  assert.match(sheetSource, /buildOutfitSavePayloads\(outfits\)/);
  assert.match(payloadSource, /export function buildCharacterSavePayload/);
  assert.match(payloadSource, /export function buildSkillSavePayloads/);
  assert.match(payloadSource, /export function buildOutfitSavePayloads/);
});

test("transactional persistence is isolated behind the classic sheet persistence module", () => {
  assert.match(sheetSource, /sheet-save-persistence\.js\?v=1/);
  assert.match(sheetSource, /persistSheetBundle\(\{/);
  assert.match(sheetSource, /character: collectCharacter\(\)/);
  assert.match(sheetSource, /skills: collectSkills\(\)/);
  assert.match(sheetSource, /outfits: collectOutfits\(\)/);
  assert.doesNotMatch(sheetSource, /supabase\.rpc\("save_character_bundle/);
  assert.match(persistenceSource, /const SAVE_RPC = "save_character_bundle_with_ofc"/);
  assert.match(persistenceSource, /supabase\.rpc\(SAVE_RPC/);
  assert.match(persistenceSource, /p_character: character/);
  assert.match(persistenceSource, /p_skills: skills/);
  assert.match(persistenceSource, /p_outfits:\s*Array\.isArray\(outfits\) \? outfits : \[\]/);
  assert.match(sheetSource, /tnx:character-saved/);
});

test("outfit canonicalization is complete before persistence and requires no DOM enrichment", () => {
  assert.match(payloadSource, /function buildOutfitDetails/);
  assert.match(payloadSource, /ofc_details:\s*buildOutfitDetails/);
  assert.doesNotMatch(persistenceSource, /outfit-ofc-save|enrichOutfitPayload/);
  assert.doesNotMatch(payloadSource, /document\.|querySelector|TNXOutfitOFCState/);
});
