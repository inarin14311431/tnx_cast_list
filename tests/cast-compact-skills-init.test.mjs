import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/cast-compact-skills.js", import.meta.url), "utf8");

test("compact skill initialization is explicit and idempotent", () => {
  assert.match(source, /function initializeCastCompactSkills\(\)/);
  assert.match(source, /content\.dataset\.castCompactSkillsInitialized === "1"/);
  assert.match(source, /content\.dataset\.castCompactSkillsInitialized = "1"/);
  assert.match(source, /initializeCastCompactSkills\(\);/);
});

test("compact skill view preserves cast readiness observer flow", () => {
  assert.match(source, /if \(!content\.hidden\) \{/);
  assert.match(source, /new MutationObserver/);
  assert.match(source, /attributeFilter: \["hidden"\]/);
  assert.match(source, /observer\.disconnect\(\)/);
  assert.match(source, /finalize\(\)/);
});

test("compact skill view preserves general social and connection layout contracts", () => {
  assert.match(source, /\.skill-section--general/);
  assert.match(source, /\.skill-section--social/);
  assert.match(source, /\.skill-section--connection/);
  assert.match(source, /cast-general-columns/);
  assert.match(source, /cast-skill-side/);
  assert.match(source, /compactFinalized/);
});
