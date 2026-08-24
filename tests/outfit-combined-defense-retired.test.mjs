import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const pcSave = await readFile(new URL("../js/outfit-ofc-save.js", import.meta.url), "utf8");
const mobileModel = await readFile(new URL("../js/sheet-mobile-outfit-model.js", import.meta.url), "utf8");
const mobileRuntime = await readFile(new URL("../js/sheet-mobile-outfit.js", import.meta.url), "utf8");

test("PC OFC save no longer rebuilds combined outfit defense", () => {
  assert.doesNotMatch(pcSave, /function composeDefense/);
  assert.doesNotMatch(pcSave, /category === "vehicle" \? composeDefense/);
  assert.match(pcSave, /defense:\s*""/);
  assert.match(pcSave, /defense_s:/);
  assert.match(pcSave, /defense_p:/);
  assert.match(pcSave, /defense_i:/);
});

test("mobile outfit save no longer rebuilds combined outfit defense", () => {
  assert.doesNotMatch(mobileModel, /function composeDefense/);
  assert.match(mobileModel, /defense:\s*""/);
  assert.match(mobileModel, /defense_s:/);
  assert.match(mobileModel, /defense_p:/);
  assert.match(mobileModel, /defense_i:/);
  assert.doesNotMatch(mobileRuntime, /composeDefense/);
  assert.doesNotMatch(mobileRuntime, /activeDraft\.defense\s*=/);
});
