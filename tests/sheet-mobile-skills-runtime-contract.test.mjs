import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/sheet-mobile-skills.js", import.meta.url), "utf8");

test("mobile skills uses shared editor context instead of independent auth lookup", () => {
  assert.match(source, /getMobileEditorContext/);
  assert.doesNotMatch(source, /requireAuth/);
  assert.doesNotMatch(source, /from\(["']characters["']\)/);
});

test("mobile skills keeps save coordinator contract", () => {
  assert.match(source, /tnx:mobile-before-save/);
  assert.match(source, /tnx:mobile-skills-saved/);
});

test("mobile skills preserves core edit rules through the shared general catalog", () => {
  assert.match(source, /GENERAL_MOBILE_ORDER/);
  assert.match(source, /MUTABLE_GENERAL_PREFIXES/);
  assert.match(source, /general-skill-catalog\.js\?v=1/);
  assert.doesNotMatch(source, /PC_GENERAL_ORDER/);
  assert.match(source, /STYLE_SEPARATOR/);
  assert.match(source, /levelOptions\(current,\s*floor\s*=\s*0\)/);
});
