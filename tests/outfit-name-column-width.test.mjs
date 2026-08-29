import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../css-next/editor/outfits.css", import.meta.url), "utf8");
const aligner = await readFile(new URL("../js/armor-grand-total.js", import.meta.url), "utf8");

test("all outfit categories share the canonical name column width token", () => {
  assert.match(css, /--outfit-name-column:\s*[^;]+;/);
  assert.match(css, /outfit-table-head--name, \.outfit-table-cell--name\) \{ width: var\(--outfit-name-column\); min-width: var\(--outfit-name-column\); max-width: var\(--outfit-name-column\); \}/);
  assert.doesNotMatch(css, /outfit-table-group--armor[^\n]*outfit-table-head--name/);
});

test("armor explanation consumes the measured remaining table width", () => {
  assert.match(aligner, /const targetWidth = scroll\?\.clientWidth/);
  assert.match(aligner, /filter\(cell => cell !== descriptionHead\)/);
  assert.match(aligner, /targetWidth - fixedWidth/);
  assert.match(aligner, /cell\.style\.width = `\$\{descriptionWidth\}px`/);
  assert.match(aligner, /window\.addEventListener\("resize", queue/);
});
