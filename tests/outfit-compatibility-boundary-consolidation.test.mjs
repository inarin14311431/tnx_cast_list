import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const pcPolicy = await readFile(new URL("../js/outfit-pc-field-policy.js", import.meta.url), "utf8");
const masterApply = await readFile(new URL("../js/outfit-ofc-master-apply.js", import.meta.url), "utf8");
const tsv = await readFile(new URL("../js/outfit-ofc-tsv.js", import.meta.url), "utf8");

test("PC outfit policy reuses the shared legacy concealment parser", () => {
  assert.match(pcPolicy, /splitLegacyConcealment/);
  assert.match(pcPolicy, /outfit-legacy-compat\.js\?v=1/);
  assert.doesNotMatch(pcPolicy, /outfit-view-model\.js\?v=2/);
  assert.doesNotMatch(pcPolicy, /function splitConcealment\(/);
});

test("OFC master and TSV routes use the current shared adapter cache boundary", () => {
  assert.match(masterApply, /outfit-ofc-adapter\.js\?v=2/);
  assert.match(tsv, /outfit-ofc-adapter\.js\?v=2/);
  assert.doesNotMatch(masterApply, /outfit-ofc-adapter\.js\?v=1/);
  assert.doesNotMatch(tsv, /outfit-ofc-adapter\.js\?v=1/);
});
