import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const js = await readFile(new URL("../js/skill-display-enhancements.js", import.meta.url), "utf8");
const castEntry = await readFile(new URL("../css-next/pages/cast-entry.css", import.meta.url), "utf8");
const sheetEntry = await readFile(new URL("../css-next/pages/sheet-entry.css", import.meta.url), "utf8");

async function exists(url) {
  try { await access(url); return true; } catch { return false; }
}

test("skill display stylesheet uses the canonical ownership name", async () => {
  assert.match(castEntry, /\.\.\/components\/skill-display\.css\?v=1/);
  assert.match(sheetEntry, /\.\.\/components\/skill-display\.css\?v=1/);
  assert.doesNotMatch(castEntry + sheetEntry, /skill-display-enhancements\.css/);
  assert.equal(await exists(new URL("../css-next/components/skill-display.css", import.meta.url)), true);
  assert.equal(await exists(new URL("../css-next/components/skill-display-enhancements.css", import.meta.url)), false);
});

test("skill display observer is limited to owned skill roots", () => {
  for (const selector of ["#general-skills", "#style-skills", "#skills-container", "#quick-sheet-pages"]) {
    assert.ok(js.includes(`\"${selector}\"`));
  }
  assert.match(js, /ROOT_SELECTORS\.map\(selector => document\.querySelector\(selector\)\)\.filter\(Boolean\)/);
  assert.match(js, /observer\.observe\(root, \{ childList: true, subtree: true \}\)/);
  assert.doesNotMatch(js, /observe\(document\.body/);
  assert.doesNotMatch(js, /document\.addEventListener\('change', queue, true\)/);
});
