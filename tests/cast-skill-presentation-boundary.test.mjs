import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const compactSource = await readFile(new URL("../js/cast-compact-skills.js", import.meta.url), "utf8");
const styleSource = await readFile(new URL("../js/cast-style-skills.js", import.meta.url), "utf8");

test("compact skill presentation owns general/social/connection layout only", () => {
  assert.match(compactSource, /#skills-container/);
  assert.match(compactSource, /cast-general-columns/);
  assert.match(compactSource, /cast-skill-side/);
  assert.match(compactSource, /GENERAL_SKILL_REQUIRED_FAMILIES/);
  assert.doesNotMatch(compactSource, /tnx:style-skills-rendered/);
});

test("style skill presentation owns dedicated style rendering and render event", () => {
  assert.match(styleSource, /ensureDedicatedPanel\(section\)/);
  assert.match(styleSource, /renderTable\(section, skills\)/);
  assert.match(styleSource, /tnx:style-skills-rendered/);
  assert.doesNotMatch(styleSource, /cast-general-columns/);
  assert.doesNotMatch(styleSource, /cast-skill-side/);
});

test("both skill presentation modules retain cast-ready delayed rendering boundaries", () => {
  assert.match(compactSource, /new MutationObserver\(/);
  assert.match(compactSource, /attributeFilter:\s*\["hidden"\]/);
  assert.match(styleSource, /whenCastReady\(/);
  assert.match(styleSource, /new MutationObserver\(/);
  assert.match(styleSource, /attributeFilter:\s*\["hidden"\]/);
});
