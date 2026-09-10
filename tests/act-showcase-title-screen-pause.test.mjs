import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/act-showcase-neotokyo.js", import.meta.url), "utf8");

test("ACT title screen is restored and waits for an explicit click", () => {
  assert.match(source, /const SHOW_ACT_TITLE_SCREEN = true;/);
  assert.match(source, /if \(SHOW_ACT_TITLE_SCREEN\) \{\s*await showActTitle\(state, model\);\s*if \(state\.finished\) return;\s*\}/s);
  assert.match(source, /async function showActTitle\(state, model\)/);
  assert.match(source, /await waitForAdvance\(state, "NEXT \/\/ ACT TRAILER"\);/);
  assert.match(source, /stage\.addEventListener\("click", event => \{/);
  assert.match(source, /if \(event\.target\.closest\("button"\)\) return;/);
  assert.match(source, /state\.requestAdvance\(\);/);
  assert.doesNotMatch(source, /swapScreen\(state, content\);\s*await wait\(state, 1900\);/);
});
