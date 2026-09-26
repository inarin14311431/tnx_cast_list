import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/cast-view-controls.js", import.meta.url), "utf8");

test("cast description controls use an explicit idempotent initializer", () => {
  assert.match(source, /function initializeCastDescriptionControls\(\)/);
  assert.match(source, /const htmlRoot = document\.documentElement/);
  assert.match(source, /htmlRoot\.dataset\.castDescriptionControlsInitialized === "1"/);
  assert.match(source, /htmlRoot\.dataset\.castDescriptionControlsInitialized = "1"/);
  assert.match(source, /initializeCastDescriptionControls\(\);/);
});

test("cast description controls preserve individual bulk keyboard and render initialization behavior", () => {
  const start = source.indexOf("function initializeCastDescriptionControls");
  const end = source.indexOf("\n})();", start);
  const initializer = source.slice(start, end);

  assert.match(initializer, /const STYLE_FIELD_SELECTOR = "\.style-description-expandable"/);
  assert.match(initializer, /const OUTFIT_FIELD_SELECTOR = "\.outfit-description-expandable"/);
  assert.match(initializer, /\.style-description-toggle-all/);
  assert.match(initializer, /resizeDescriptionField\(field, expanded\)/);
  assert.match(initializer, /document\.addEventListener\("click"/);
  assert.match(initializer, /document\.addEventListener\("keydown"/);
  assert.match(initializer, /\["Enter", " "\]\.includes\(event\.key\)/);
  assert.match(initializer, /field\.dataset\.descriptionClickReady = "1"/);
  assert.match(initializer, /tnx:cast-rendered/);
  assert.match(initializer, /applyAfterCastRender/);
  assert.match(initializer, /once: true/);
  assert.doesNotMatch(initializer, /new MutationObserver/);
  assert.doesNotMatch(initializer, /observe\(castContent/);
});
