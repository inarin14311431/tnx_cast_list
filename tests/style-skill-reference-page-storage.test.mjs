import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const fields = await read("js/style-skill-fields.js");
const mobileHtml = await read("sheet-mobile.html");
const mobileSkills = await read("js/sheet-mobile-skills.js");

test("PC style skill reference page stays an editable projected field", () => {
  assert.match(fields, /\["page","参照P","input"\]/);
  assert.match(fields, /delete original\.dataset\.styleField;/);
  assert.match(fields, /row\.querySelectorAll\("\[data-style-field\]"\)\.forEach\(element=>\{\s*if\(element===original\)return;/);
});

test("reference page remains editable and saved on the mobile editor too", () => {
  assert.match(mobileHtml, /<label>参照P<input data-mobile-style-detail="page"><\/label>/);
  assert.match(mobileSkills, /const DETAIL_FIELDS = \[[^\]]*"page"\];/);
  assert.match(mobileSkills, /for \(const key of DETAIL_FIELDS\) detail\[key\] = document\.querySelector\(`/);
  assert.match(mobileSkills, /item\.description = encodeDetail\(detail\);/);
});

test("existing nested data is not repaired by the editor fix", () => {
  assert.doesNotMatch(fields, /for\(let depth=0;depth<8;depth\+\+\)/);
  assert.doesNotMatch(fields, /const nested=decode\(data\.description\);/);
});
