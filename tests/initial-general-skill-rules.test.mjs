import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { INITIAL_GENERAL_SKILL_SUITS, initialGeneralSkillSuit } from "../js/general-skill-catalog.js";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("initial general skills are the thirteen non-proper master skills", () => {
  assert.equal(Object.keys(INITIAL_GENERAL_SKILL_SUITS).length, 13);
  assert.equal(initialGeneralSkillSuit("医療"), "reason");
  assert.equal(initialGeneralSkillSuit("心理"), "passion");
  assert.equal(initialGeneralSkillSuit("運動"), "life");
  assert.equal(initialGeneralSkillSuit("信用"), "mundane");
  assert.equal(initialGeneralSkillSuit("製作："), "");
  assert.equal(initialGeneralSkillSuit("芸術："), "");
  assert.equal(initialGeneralSkillSuit("操縦："), "");
});

test("PC editor locks initial level and starting suit", async () => {
  const source = await read("js/general-initial-skill-rules.js");
  assert.match(source, /level\.min = "1"/);
  assert.match(source, /Number\(level\.value \|\| 0\) < 1/);
  assert.match(source, /input\.disabled = locked/);
  assert.match(source, /input\.dataset\.initialGeneralSuit = "1"/);
  assert.match(source, /emitInput\(input\)/);
});

test("mobile editor loads the same initial-skill rule", async () => {
  const app = await read("js/sheet-mobile-app.js");
  const source = await read("js/sheet-mobile-initial-general-rules.js");
  assert.match(app, /sheet-mobile-initial-general-rules\.js/);
  assert.match(source, /initialGeneralSkillSuit/);
  assert.match(source, /input\.disabled = locked/);
  assert.match(source, /初期取得技能：LV1未満不可／初期スート固定/);
});

test("PC save payload canonicalizes invalid legacy initial-skill rows", async () => {
  const source = await read("js/sheet-save-payload.js");
  assert.match(source, /initialGeneralSkillSuit/);
  assert.match(source, /level: Math\.max\(1, Number\(item\.level \|\| 0\)\)/);
  assert.match(source, /\[requiredSuit\]: true/);
});

test("armor keeps the shared fixed name width and delegates spare width to the layout helper", async () => {
  const css = await read("css-next/editor/outfits.css");
  const aligner = await read("js/armor-grand-total.js");
  assert.match(css, /--outfit-name-column:\s*150px/);
  assert.match(css, /outfit-table-head--name, \.outfit-table-cell--name\) \{ width: var\(--outfit-name-column\); min-width: var\(--outfit-name-column\); max-width: var\(--outfit-name-column\); \}/);
  assert.doesNotMatch(css, /outfit-table-group--armor[^\n]*outfit-table-head--name/);
  assert.doesNotMatch(css, /calc\(52\.8% - var\(--outfit-name-column\) - var\(--row-action-column\)\)/);
  assert.match(aligner, /targetWidth - fixedWidth/);
  assert.match(aligner, /outfit-table-cell--description/);
});
