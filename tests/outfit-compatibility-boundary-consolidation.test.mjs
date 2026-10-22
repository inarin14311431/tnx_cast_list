import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { assertVersionedMatch } from "./helpers/cache-version.mjs";

const pcPolicy = await readFile(new URL("../js/outfit-pc-field-policy.js", import.meta.url), "utf8");
const masterApply = await readFile(new URL("../js/outfit-ofc-master-apply.js", import.meta.url), "utf8");

test("PC outfit policy reuses the shared legacy concealment parser", () => {
  assert.match(pcPolicy, /splitLegacyConcealment/);
  assertVersionedMatch(pcPolicy, /outfit-legacy-compat\.js\?v=VERSION/);
  assert.doesNotMatch(pcPolicy, /outfit-view-model\.js/);
  assert.doesNotMatch(pcPolicy, /function splitConcealment\(/);
});

test("OFC master route uses the current shared adapter cache boundary", () => {
  assertVersionedMatch(masterApply, /outfit-ofc-adapter\.js\?v=VERSION/);
  assert.doesNotMatch(masterApply, /outfit-ofc-tsv/);
});
