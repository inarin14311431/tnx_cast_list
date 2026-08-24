import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const ROOT = process.cwd();
const source = fs.readFileSync(path.join(ROOT, "js", "sheet-master-autofill.js"), "utf8");

test("SKD/OFC autofill keeps concealment value and modifier as separate canonical fields", () => {
  assert.match(source, /const concealmentValue = firstPresent\(/);
  assert.match(source, /const concealmentPenalty = firstPresent\(/);
  assert.match(source, /fillControl\(base\("concealment"\), concealmentValue\)/);
  assert.match(source, /fillControl\(ofc\("concealment_penalty"\), concealmentPenalty\)/);
  assert.doesNotMatch(source, /\[source\.concealment, source\.concealment_penalty\][\s\S]{0,120}join\("\/"\)/);
});

test("residence concealment autofill can fall back to raw OFC source labels", () => {
  assert.match(source, /raw\["隠匿値"\]/);
  assert.match(source, /raw\["隠匿修正"\]/);
  assert.match(source, /raw\["ペナ"\]/);
});

test("duplicate candidate scoring considers separate concealment fields", () => {
  assert.match(source, /\[base\("concealment"\), source\.concealment\]/);
  assert.match(source, /\[ofc\("concealment_penalty"\), source\.concealment_penalty\]/);
});
