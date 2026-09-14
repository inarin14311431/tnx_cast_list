import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sheet = await readFile(new URL("../sheet.html", import.meta.url), "utf8");
const cast = await readFile(new URL("../js/cast.js", import.meta.url), "utf8");
const castMobile = await readFile(new URL("../js/cast-mobile.js", import.meta.url), "utf8");
const castHtml = await readFile(new URL("../cast.html", import.meta.url), "utf8");

test("combo usage labels are generic instead of act-specific", () => {
  assert.doesNotMatch(sheet, /1アクト使用上限|USES \/ ACT|1アクトの使用回数/);
  assert.match(sheet, /使用回数 <small>USES<\/small>/);
  assert.match(sheet, /使用回数 \* <small>USES<\/small>/);

  assert.doesNotMatch(cast, /1アクト使用回数|ACT USES/);
  assert.match(cast, /使用回数 <small>USES<\/small>/);

  assert.doesNotMatch(castMobile, /回\/ACT/);
  assert.match(castMobile, /\["使用回数",`\$\{limit\}回`\]/);
  assert.match(castMobile, /使用回数　\$\{limit\}回/);
});

test("usage limit storage contract remains unchanged", () => {
  assert.match(sheet, /id="sheet-combo-act-use-limit"/);
  assert.match(cast, /act_use_limit/);
  assert.match(castMobile, /act_use_limit/);
});

test("cast usage label changes have cache-buster updates", () => {
  assert.match(castHtml, /\.\/js\/cast\.js\?v=96/);
  assert.match(castHtml, /\.\/js\/cast-mobile\.js\?v=6/);
});
