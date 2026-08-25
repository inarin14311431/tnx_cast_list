import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { LEGACY_OUTFIT_CUTOFF, isLegacyOutfitCharacter } from "../js/sheet-legacy-outfit-compat.js";

const loadSource = await readFile(new URL("../js/sheet-load-persistence.js", import.meta.url), "utf8");
const coordinatorSource = await readFile(new URL("../js/sheet-save-coordinator.js", import.meta.url), "utf8");
const legacySource = await readFile(new URL("../js/sheet-legacy-outfit-compat.js", import.meta.url), "utf8");

test("legacy outfit compatibility uses a fixed retirement cutoff", () => {
  assert.equal(LEGACY_OUTFIT_CUTOFF, "2026-08-19T08:00:08.000Z");
  assert.equal(isLegacyOutfitCharacter({ updated_at: "2026-08-19T08:00:07.999Z" }), true);
  assert.equal(isLegacyOutfitCharacter({ updated_at: "2026-08-19T08:00:08.000Z" }), false);
  assert.equal(isLegacyOutfitCharacter({ updated_at: "2026-08-20T00:00:00.000Z" }), false);
  assert.equal(isLegacyOutfitCharacter({}), false);
});

test("load persistence emits the character metadata required by the temporary bridge", () => {
  assert.match(loadSource, /tnx:sheet-character-loaded/);
  assert.match(loadSource, /detail: \{ character \}/);
});

test("legacy behavior is detachable from normal save mechanics", () => {
  assert.match(coordinatorSource, /installLegacyOutfitCompatibility/);
  assert.doesNotMatch(coordinatorSource, /LEGACY_OUTFIT_CUTOFF/);
  assert.doesNotMatch(coordinatorSource, /QUIET_MS/);
  assert.match(legacySource, /inputEvent\?\.isTrusted/);
  assert.match(legacySource, /MutationObserver/);
  assert.match(legacySource, /if \(!isLegacyOutfitCharacter\(character\)\) return/);
});
