import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { STYLE_DATA, UTSUWA_ATTRIBUTES } from "../js/style-data.js";
import {
  resolveStyleRecord,
  calculateStyleBaselines
} from "../js/sheet-style-baseline.js";

const ABILITIES = [
  ["reason"], ["passion"], ["life"], ["mundane"]
];

test("regular style baselines sum current STYLE_DATA ability and control pairs", () => {
  const result = calculateStyleBaselines({
    slots: [{ name: "カブキ" }, { name: "カタナ" }],
    abilities: ABILITIES,
    styleData: STYLE_DATA,
    utsuwaAttributes: UTSUWA_ATTRIBUTES
  });

  assert.deepEqual(result, {
    reason: 2, "reason-control": 7,
    passion: 3, "passion-control": 9,
    life: 5, "life-control": 9,
    mundane: 4, "mundane-control": 7
  });
});

test("ウツワ resolves its selected attribute instead of the special style shell", () => {
  const record = resolveStyleRecord(
    { name: "ウツワ", attribute: "雷神" },
    { styleData: STYLE_DATA, utsuwaAttributes: UTSUWA_ATTRIBUTES }
  );
  assert.equal(record?.name, "雷神");

  const result = calculateStyleBaselines({
    slots: [{ name: "ウツワ", attribute: "雷神" }],
    abilities: ABILITIES,
    styleData: STYLE_DATA,
    utsuwaAttributes: UTSUWA_ATTRIBUTES
  });
  assert.deepEqual(result, {
    reason: 3, "reason-control": 5,
    passion: 1, "passion-control": 3,
    life: 1, "life-control": 3,
    mundane: 2, "mundane-control": 5
  });
});

test("empty, unknown and attribute-less slots contribute zero without throwing", () => {
  const result = calculateStyleBaselines({
    slots: [{}, { name: "UNKNOWN" }, { name: "ウツワ", attribute: "" }],
    abilities: ABILITIES,
    styleData: STYLE_DATA,
    utsuwaAttributes: UTSUWA_ATTRIBUTES
  });
  assert.deepEqual(result, {
    reason: 0, "reason-control": 0,
    passion: 0, "passion-control": 0,
    life: 0, "life-control": 0,
    mundane: 0, "mundane-control": 0
  });
});

test("style baseline helper remains DOM-free and classic sheet delegates calculation", async () => {
  const helperSource = await readFile(new URL("../js/sheet-style-baseline.js", import.meta.url), "utf8");
  const sheetSource = await readFile(new URL("../js/sheet.js", import.meta.url), "utf8");

  assert.doesNotMatch(helperSource, /document\.|window\.|supabase|localStorage|sessionStorage|addEventListener/);
  assert.match(sheetSource, /sheet-style-baseline\.js\?v=1/);
  assert.match(sheetSource, /calculateStyleBaselines\(/);
  assert.doesNotMatch(sheetSource, /function styleRecord\(/);
  assert.match(sheetSource, /function adjustBaseline\(/);
});
