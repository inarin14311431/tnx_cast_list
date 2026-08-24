import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/cast-view-controls.js", import.meta.url), "utf8");

test("cast public ID uses an explicit idempotent initializer", () => {
  assert.match(source, /function initializeCastPublicId\(\)/);
  assert.match(source, /root\.dataset\.castPublicIdInitialized === "1"/);
  assert.match(source, /root\.dataset\.castPublicIdInitialized = "1"/);
  assert.match(source, /initializeCastPublicId\(\);/);
});

test("cast public ID preserves obfuscation and refresh hooks", () => {
  assert.match(source, /TNX_CAST_ARCHIVE::/);
  assert.match(source, /0x811c9dc5/);
  assert.match(source, /Math\.imul\(hash, 0x01000193\)/);
  assert.match(source, /return `TNX-\$\{\(hash >>> 0\)\.toString\(16\)\.toUpperCase\(\)\.padStart\(8, "0"\)\}`/);
  assert.match(source, /replaceAll\(sourceId, displayId\)/);
  assert.match(source, /new MutationObserver\(refreshDisplay\)/);
  assert.match(source, /observer\.observe\(statusElement, \{ childList: true, characterData: true, subtree: true \}\)/);
  assert.match(source, /observer\.observe\(accessTargetElement, \{ childList: true, characterData: true, subtree: true \}\)/);
});
