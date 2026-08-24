import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/cast-style-skills.js", import.meta.url), "utf8");

test("style skill view uses an explicit idempotent initializer", () => {
  assert.match(source, /async function initializeCastStyleSkills\(\)/);
  assert.match(source, /root\.dataset\.castStyleSkillsInitialized === "1"/);
  assert.match(source, /root\.dataset\.castStyleSkillsInitialized = "1"/);
  assert.match(source, /initializeCastStyleSkills\(\);/);
});

test("style skill view preserves data load and cast-ready render flow", () => {
  assert.match(source, /const skills =? ?await getStyleSkills\(\)|skills = await getStyleSkills\(\)/);
  assert.match(source, /whenCastReady\(\(\) =>/);
  assert.match(source, /ensureDedicatedPanel\(section\)/);
  assert.match(source, /renderTable\(section, skills\)/);
});

test("style skill view preserves editor-like detail table contracts", () => {
  assert.match(source, /@@TNX_STYLE_DETAIL_V1@@/);
  assert.match(source, /\[\[STYLE_SEPARATOR\]\]/);
  assert.match(source, /style-description-expandable/);
  assert.match(source, /style-description-toggle-all/);
  assert.match(source, /tnx:style-skills-rendered/);
});

test("style skill view preserves cast readiness observer contract", () => {
  assert.match(source, /new MutationObserver/);
  assert.match(source, /attributeFilter: \["hidden"\]/);
  assert.match(source, /observer\.disconnect\(\)/);
});
