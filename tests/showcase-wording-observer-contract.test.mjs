import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { assertVersionedMatch } from "./helpers/cache-version.mjs";

const html = fs.readFileSync("showcase-generator.html", "utf8");
const source = fs.readFileSync("js/showcase-wording.js", "utf8");

test("showcase wording follows explicit selection rendering without a mutation observer", () => {
  assert.doesNotMatch(source, /MutationObserver/);
  assert.match(source, /tnx:showcase-selection-rendered/);
  assert.match(source, /normalize\(\)/);
  assert.match(source, /ensureActTitleGuide\(\)/);
});

test("showcase wording keeps idempotent title guide updates", () => {
  assert.match(source, /if \(guide\.textContent !== nextText\) guide\.textContent = nextText;/);
  assert.match(source, /if \(guide\.dataset\.state !== nextState\) guide\.dataset\.state = nextState;/);
});

test("showcase generator loads the wording module", () => {
  assertVersionedMatch(html, /showcase-wording\.js\?v=VERSION/);
});
