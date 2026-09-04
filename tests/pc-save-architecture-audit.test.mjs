import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = name => readFile(new URL(`../js/${name}`, import.meta.url), "utf8");

const [
  sheet,
  payload,
  persistence,
  loadPersistence,
  loadNormalization,
  errorMessage,
  coordinator,
  state,
  diagnostics
] = await Promise.all([
  read("sheet.js"),
  read("sheet-save-payload.js"),
  read("sheet-save-persistence.js"),
  read("sheet-load-persistence.js"),
  read("sheet-load-normalization.js"),
  read("sheet-error-message.js"),
  read("sheet-save-coordinator.js"),
  read("sheet-save-state.js"),
  read("sheet-save-diagnostics.js")
]);

const runtimeDependencyPattern = /document\.|querySelector|window\.|from\s+["'][^"']*supabase-client|supabase\.(?:from|rpc|auth|storage)/;

test("classic editor keeps database transport ownership outside sheet.js", () => {
  assert.doesNotMatch(sheet, /supabase\.rpc\s*\(/);
  assert.doesNotMatch(sheet, /supabase\.from\s*\(/);
  assert.match(sheet, /persistSheetBundle\(/);
  assert.match(sheet, /loadSheetBundle\(/);
  assert.match(persistence, /save_character_bundle_with_ofc/);
  assert.match(persistence, /p_character_id:/);
  assert.match(persistence, /p_character:/);
  assert.match(persistence, /p_skills:/);
  assert.match(persistence, /p_outfits:/);
  assert.match(loadPersistence, /\.from\("characters"\)/);
  assert.match(loadPersistence, /\.from\("character_skills"\)/);
  assert.match(loadPersistence, /\.from\("character_outfits"\)/);
});

test("DB-shaped serialization and loaded-record normalization remain DOM-free", () => {
  assert.doesNotMatch(payload, runtimeDependencyPattern);
  assert.doesNotMatch(loadNormalization, runtimeDependencyPattern);
  assert.doesNotMatch(errorMessage, runtimeDependencyPattern);
  assert.doesNotMatch(persistence, /document\.|querySelector|#save-/);
  assert.doesNotMatch(loadPersistence, /document\.|querySelector|#save-/);
  assert.match(sheet, /buildCharacterSavePayload/);
  assert.match(sheet, /buildSkillSavePayloads/);
  assert.match(sheet, /buildOutfitSavePayloads/);
  assert.match(sheet, /normalizeLoadedSkill/);
  assert.match(sheet, /normalizeLoadedOutfit/);
  assert.match(sheet, /formatSheetPersistenceError/);
});

test("sheet.js no longer owns loaded skill/outfit normalization or persistence error wording", () => {
  assert.doesNotMatch(sheet, /function normalizeSkill\s*\(/);
  assert.doesNotMatch(sheet, /function normalizeOutfit\s*\(/);
  assert.doesNotMatch(sheet, /function inferKind\s*\(/);
  assert.doesNotMatch(sheet, /function isStyleSeparatorDescription\s*\(/);
  assert.doesNotMatch(sheet, /function jpError\s*\(/);
});

test("save lifecycle modules do not regain database or payload ownership", () => {
  assert.doesNotMatch(coordinator, /supabase|save_character_bundle|p_character|p_skills|p_outfits/);
  assert.doesNotMatch(state, /supabase|save_character_bundle|p_character|p_skills|p_outfits/);
  assert.doesNotMatch(diagnostics, /supabase-client|supabase\.rpc\s*=/);
});

test("save state presentation remains explicit rather than DOM-derived", () => {
  assert.match(state, /setSheetSaveState/);
  assert.doesNotMatch(state, /MutationObserver/);
  assert.doesNotMatch(coordinator, /querySelector\(["']#save-status/);
  assert.doesNotMatch(diagnostics, /MutationObserver/);
});

test("outfit persistence receives the canonical model projection without DOM enrichment", () => {
  assert.doesNotMatch(persistence, /enrichOutfitPayload|outfit-ofc-save/);
  assert.match(persistence, /p_outfits:\s*Array\.isArray\(outfits\) \? outfits : \[\]/);
  assert.match(payload, /ofc_details:\s*buildOutfitDetails\(item, category\)/);
  assert.doesNotMatch(payload, /document\.|querySelector|TNXOutfitOFCState/);
});

test("retired save compatibility cannot leak back through current save modules", () => {
  const currentSaveSources = [sheet, payload, persistence, coordinator, state, diagnostics];
  for (const source of currentSaveSources) {
    assert.doesNotMatch(source, /mundane_modifier/);
    assert.doesNotMatch(source, /control_value/);
    assert.doesNotMatch(source, /cs_value/);
  }
  assert.doesNotMatch(payload, /\bdefense\s*:/);
  assert.doesNotMatch(payload, /composeDefense|parseDefense|data-armor-defense/);
  assert.match(payload, /defense_s:\s*"defense_s"/);
  assert.match(payload, /defense_p:\s*"defense_p"/);
  assert.match(payload, /defense_i:\s*"defense_i"/);
});

test("save-in-flight edits stay protected by revision-aware coordinator logic", () => {
  assert.match(coordinator, /let changeRevision = 0/);
  assert.match(coordinator, /changeRevision \+= 1/);
  assert.match(coordinator, /const revisionAtStart = changeRevision/);
  assert.match(coordinator, /const changedWhileSaving = changeRevision !== revisionAtStart/);
  assert.match(coordinator, /if \(changedWhileSaving\) pending = true/);
});
