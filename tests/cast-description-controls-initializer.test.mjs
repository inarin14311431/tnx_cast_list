import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/cast-view-controls.js", import.meta.url), "utf8");

test("cast description controls use an explicit idempotent initializer", () => {
  assert.match(source, /function initializeCastDescriptionControls\(\)/);
  assert.match(source, /root\.dataset\.castDescriptionControlsInitialized === "1"/);
  assert.match(source, /root\.dataset\.castDescriptionControlsInitialized = "1"/);
  assert.match(source, /initializeCastDescriptionControls\(\);/);
});

test("cast description controls preserve individual bulk keyboard and mutation behavior", () => {
  assert.match(source, /const STYLE_FIELD_SELECTOR = "\.style-description-expandable"/);
  assert.match(source, /const OUTFIT_FIELD_SELECTOR = "\.outfit-description-expandable"/);
  assert.match(source, /\.style-description-toggle-all/);
  assert.match(source, /resizeDescriptionField\(field, expanded\)/);
  assert.match(source, /document\.addEventListener\("click"/);
  assert.match(source, /document\.addEventListener\("keydown"/);
  assert.match(source, /\["Enter", " "\]\.includes\(event\.key\)/);
  assert.match(source, /field\.dataset\.descriptionClickReady = "1"/);
  assert.match(source, /new MutationObserver\(prepareDescriptionFields\)\.observe\(document\.body, \{ childList: true, subtree: true \}\)/);
});
