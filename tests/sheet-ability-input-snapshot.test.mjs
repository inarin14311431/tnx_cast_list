import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { collectAbilityInputSnapshot, applyAbilityInputSnapshot } from "../js/sheet-ability-input-snapshot.js";

function fakeRoot(values = {}) {
  const controls = new Map(Object.entries(values).map(([selector, value]) => [selector, { value }]));
  return {
    querySelector(selector) { return controls.get(selector) || null; },
    value(selector) { return controls.get(selector)?.value; }
  };
}

test("ability input snapshot collects ability control and CS values", () => {
  const snapshot = collectAbilityInputSnapshot({
    root: fakeRoot({
      "#reason-base": "7",
      "#reason-mod": "2",
      "#reason-control-base": "12",
      "#reason-control-mod": "-1",
      "#cs-base": "8",
      "#cs-mod": "3"
    }),
    abilities: [["reason"]]
  });

  assert.deepEqual(snapshot, {
    values: {
      reason: {
        current: 7,
        modifier: 2,
        controlCurrent: 12,
        controlModifier: -1
      }
    },
    cs: { current: 8, modifier: 3 }
  });
});

test("missing and blank controls normalize to zero", () => {
  const snapshot = collectAbilityInputSnapshot({
    root: fakeRoot({ "#reason-base": "" }),
    abilities: [["reason"]]
  });
  assert.deepEqual(snapshot.values.reason, {
    current: 0,
    modifier: 0,
    controlCurrent: 0,
    controlModifier: 0
  });
  assert.deepEqual(snapshot.cs, { current: 0, modifier: 0 });
});

test("ability load application preserves current legacy fallback and split modifiers", () => {
  const root = fakeRoot({
    "#reason-base": "", "#reason-mod": "",
    "#reason-control-base": "", "#reason-control-mod": "",
    "#cs-base": "", "#cs-mod": ""
  });
  applyAbilityInputSnapshot({
    root,
    abilities: [["reason"]],
    data: {
      reason_value: 8,
      reason_gear: 2,
      reason_manual: -1,
      reason_control: 13,
      reason_control_gear: -2,
      reason_control_manual: 1,
      cs: 7,
      cs_gear: 3,
      cs_manual: -1
    },
    baselines: { reason: 6, "reason-control": 11 }
  });
  assert.equal(root.value("#reason-base"), "8");
  assert.equal(root.value("#reason-mod"), "1");
  assert.equal(root.value("#reason-control-base"), "13");
  assert.equal(root.value("#reason-control-mod"), "-1");
  assert.equal(root.value("#cs-base"), "7");
  assert.equal(root.value("#cs-mod"), "2");
});

test("ability load application falls back to calculated baselines", () => {
  const root = fakeRoot({ "#reason-base": "", "#reason-control-base": "" });
  applyAbilityInputSnapshot({ root, abilities: [["reason"]], data: {}, baselines: { reason: 5, "reason-control": 10 } });
  assert.equal(root.value("#reason-base"), "5");
  assert.equal(root.value("#reason-control-base"), "10");
});

test("classic sheet delegates ability and CS DOM reads and writes to snapshot module", async () => {
  const source = await readFile(new URL("../js/sheet.js", import.meta.url), "utf8");
  assert.match(source, /sheet-ability-input-snapshot\.js\?v=1/);
  assert.match(source, /collectAbilityInputSnapshot/);
  assert.match(source, /applyAbilityInputSnapshot/);
  assert.doesNotMatch(source, /function currentAbilityValues\(/);
  assert.doesNotMatch(source, /function current\(id\)/);
  assert.doesNotMatch(source, /data\[`\$\{key\}_control_base`\]/);
});
