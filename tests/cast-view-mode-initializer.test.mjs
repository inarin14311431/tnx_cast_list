import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/cast-view-mode.js", import.meta.url), "utf8");

test("cast view mode uses an explicit idempotent initializer", () => {
  assert.match(source, /function initializeCastViewMode\(\)/);
  assert.match(source, /root\.dataset\.castViewModeInitialized === "1"/);
  assert.match(source, /root\.dataset\.castViewModeInitialized = "1"/);
  assert.match(source, /initializeCastViewMode\(\);/);
});

test("cast view mode preserves mobile selection and toggle hooks", () => {
  assert.match(source, /requestedMode === "1" \|\| \(requestedMode !== "0" && autoMobile\)/);
  assert.match(source, /history\.replaceState\(null, "", modeUrl\("1"\)\)/);
  assert.match(source, /document\.addEventListener\("DOMContentLoaded", bind, \{ once: true \}\)/);
  assert.match(source, /new MutationObserver/);
  assert.match(source, /mobile-cast-requested/);
  assert.match(source, /data-cast-mobile-toggle/);
  assert.match(source, /mobile-cast-topbar__desktop/);
});
