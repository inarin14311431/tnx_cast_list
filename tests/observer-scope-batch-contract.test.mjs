import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const handle = await readFile(new URL("../js/handle-format.js", import.meta.url), "utf8");
const theme = await readFile(new URL("../js/theme-scope.js", import.meta.url), "utf8");
const marks = await readFile(new URL("../js/style-mark-normalizer.js", import.meta.url), "utf8");
const experience = await readFile(new URL("../js/experience.js", import.meta.url), "utf8");

test("handle normalization observes main content instead of the full document", () => {
  assert.match(handle, /document\.querySelector\("main"\)/);
  assert.match(handle, /observer\.observe\(root,/);
  assert.doesNotMatch(handle, /observer\.observe\(document\.documentElement/);
});

test("theme scope waits for body and observes only the body subtree", () => {
  assert.match(theme, /const root = document\.body;/);
  assert.match(theme, /observer\.observe\(root,/);
  assert.match(theme, /DOMContentLoaded/);
  assert.doesNotMatch(theme, /observer\.observe\(document\.documentElement/);
});

test("style mark normalization observes only cast list roots", () => {
  assert.match(marks, /rootSelectors = \["#cast-grid", "#owned-casts"\]/);
  assert.match(marks, /roots\.forEach\(root => observer\.observe\(root,/);
  assert.doesNotMatch(marks, /observer\.observe\(document\.body/);
});

test("experience recalculation observes the sheet layout rather than the document", () => {
  assert.match(experience, /document\.querySelector\("\.sheet-layout"\)/);
  assert.match(experience, /\.observe\(sheetRoot,/);
  assert.doesNotMatch(experience, /\.observe\(document\.documentElement/);
});
