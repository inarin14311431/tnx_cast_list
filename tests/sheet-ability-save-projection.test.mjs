import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildAbilitySaveSnapshot,
  buildCsSaveSnapshot
} from "../js/sheet-ability-save-projection.js";

const ABILITIES = [
  ["reason", "理性", "REASON"],
  ["passion", "感情", "PASSION"]
];

test("ability save snapshot preserves current baseline modifier and control semantics", () => {
  assert.deepEqual(buildAbilitySaveSnapshot({
    abilities: ABILITIES,
    values: {
      reason: { current: "7", modifier: "-1", controlCurrent: 12, controlModifier: "2" },
      passion: { current: 5, modifier: 0, controlCurrent: "10", controlModifier: -2 }
    },
    baselines: { reason: 6, "reason-control": 11, passion: "5", "passion-control": "9" }
  }), {
    reason: { current: 7, baseline: 6, modifier: -1, controlCurrent: 12, controlBaseline: 11, controlModifier: 2 },
    passion: { current: 5, baseline: 5, modifier: 0, controlCurrent: 10, controlBaseline: 9, controlModifier: -2 }
  });
});

test("missing ability save values normalize to zero", () => {
  assert.deepEqual(buildAbilitySaveSnapshot({ abilities: [["reason"]] }), {
    reason: { current: 0, baseline: 0, modifier: 0, controlCurrent: 0, controlBaseline: 0, controlModifier: 0 }
  });
});

test("CS save snapshot preserves numeric base and modifier", () => {
  assert.deepEqual(buildCsSaveSnapshot({ current: "8", modifier: "-2" }), { base: 8, modifier: -2 });
  assert.deepEqual(buildCsSaveSnapshot(), { base: 0, modifier: 0 });
});

test("ability save projection stays DOM-free and classic sheet delegates save shaping", async () => {
  const helperSource = await readFile(new URL("../js/sheet-ability-save-projection.js", import.meta.url), "utf8");
  const sheetSource = await readFile(new URL("../js/sheet.js", import.meta.url), "utf8");
  assert.doesNotMatch(helperSource, /document\.|window\.|querySelector|supabase|localStorage|sessionStorage/);
  assert.match(sheetSource, /sheet-ability-save-projection\.js\?v=1/);
  assert.match(sheetSource, /buildAbilitySaveSnapshot/);
  assert.match(sheetSource, /buildCsSaveSnapshot/);
});
