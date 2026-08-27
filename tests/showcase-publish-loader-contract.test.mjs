import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const html = fs.readFileSync("showcase-generator.html", "utf8");
const loader = fs.readFileSync("js/showcase-generator-loader.js", "utf8");

test("ACT showcase publishing is a critical module loaded before optional enhancements", () => {
  const publishIndex = loader.indexOf("showcase-dynamic-publish.js?v=5");
  const optionalIndex = loader.indexOf("const optionalModules");
  assert.ok(publishIndex >= 0, "dynamic publish module must be loaded");
  assert.ok(optionalIndex >= 0, "optional module boundary must exist");
  assert.ok(publishIndex < optionalIndex, "publishing must initialize before optional modules");
  assert.match(loader, /Promise\.all\(optionalModules\.map/);
  assert.match(loader, /reportOptionalModuleError/);
});

test("ACT showcase generator uses an explicit observable bootstrap", () => {
  assert.match(loader, /async function initializeShowcaseGenerator\(\)/);
  assert.match(loader, /dataset\.showcaseGeneratorState = "loading"/);
  assert.match(loader, /dataset\.showcaseGeneratorState = "ready"/);
  assert.match(loader, /dataset\.showcaseGeneratorState = "error"/);
  assert.match(loader, /void initializeShowcaseGenerator\(\)/);
});

test("ACT showcase generator refreshes both outer and nested cache boundaries", () => {
  assert.match(html, /showcase-generator-loader\.js\?v=21/);
  assert.doesNotMatch(html, /showcase-generator-loader\.js\?v=(?:18|19|20)/);
  assert.match(loader, /showcase-generator-v3\.js\?v=8/);
  assert.doesNotMatch(loader, /showcase-generator-v3\.js\?v=7/);
});
