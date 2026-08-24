import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/general-master-skills.js", import.meta.url), "utf8");

test("general master layout consumes the shared catalog without local skill lists", () => {
  assert.match(source, /import\("\.\/general-skill-catalog\.js\?v=2"\)/);
  assert.match(source, /GENERAL_MASTER_ROWS/);
  assert.match(source, /MUTABLE_GENERAL_PREFIXES/);
  assert.match(source, /masterNames\.slice\(0, 8\)/);
  assert.match(source, /masterNames\.slice\(8\)/);

  assert.doesNotMatch(source, /const\s+LEFT_MASTER\s*=\s*\[/);
  assert.doesNotMatch(source, /const\s+RIGHT_MASTER\s*=\s*\[/);
  assert.doesNotMatch(source, /new Set\(\["製作：","芸術：","操縦："\]\)/);
});

test("general master layout preserves fixed and specialization behavior", () => {
  assert.match(source, /dataset\.fixedGeneralMaster/);
  assert.match(source, /dataset\.generatedGeneralPlaceholder/);
  assert.match(source, /PROPER_PREFIXES\.has\(master\) \? name\.startsWith\(master\) : name === master/);
  assert.match(source, /window\.addEventListener\("tnx:general-master-ready", queue\)/);
  assert.match(source, /general-initial-skill-rules\.js\?v=1/);
});
