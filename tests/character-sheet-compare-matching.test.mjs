import test from "node:test";
import assert from "node:assert/strict";

import { diffCanonicalBundles } from "../js/character-sheet-jsonp-canonical.js?v=2";
import {
  alignCanonicalBundlesForComparison,
  stripLegacyArchiveOutfitElectronicControl
} from "../js/character-sheet-compare-matching.js?v=1";

function bundle(overrides = {}) {
  return {
    basic: {},
    personal: {},
    styles: {},
    abilities: {},
    general: {},
    social: {},
    connection: {},
    styleSkills: {},
    outfits: {},
    ...overrides
  };
}

function alignAndDiff(leftOverrides, rightOverrides) {
  const [left, right] = alignCanonicalBundlesForComparison(
    bundle(leftOverrides),
    bundle(rightOverrides)
  );
  return { left, right, diff: diffCanonicalBundles(left, right) };
}

function skill(level, suits, description = "") {
  return {
    name: "白兵",
    level,
    suits,
    description
  };
}

test("same-name skills reordered only do not create differences", () => {
  const first = skill(1, ["reason"]);
  const second = skill(2, ["passion"]);
  const { diff } = alignAndDiff(
    { general: { "白兵": first, "白兵 #2": second } },
    { general: { "白兵": second, "白兵 #2": first } }
  );

  assert.equal(diff.length, 0);
});

test("one changed same-name skill produces only the actual field difference", () => {
  const unchanged = skill(1, ["reason"]);
  const before = skill(2, ["passion"]);
  const after = skill(3, ["passion"]);
  const { left, right, diff } = alignAndDiff(
    { general: { "白兵": unchanged, "白兵 #2": before } },
    { general: { "白兵": after, "白兵 #2": unchanged } }
  );

  assert.equal(diff.length, 1);
  assert.deepEqual(left.general["白兵"], right.general["白兵"]);
  assert.notDeepEqual(left.general["白兵 #2"], right.general["白兵 #2"]);
});

test("duplicate sort-order reversal keeps the exact sibling paired", () => {
  const unchanged = skill(1, ["reason"], "same");
  const before = skill(9, ["passion"], "before");
  const after = skill(0, ["passion"], "after");
  const { left, right, diff } = alignAndDiff(
    { general: { "白兵": before, "白兵 #2": unchanged } },
    { general: { "白兵": unchanged, "白兵 #2": after } }
  );

  const exactKeys = Object.keys(left.general).filter((key) =>
    JSON.stringify(left.general[key]) === JSON.stringify(right.general[key])
  );
  assert.equal(exactKeys.length, 1);
  assert.ok(diff.length >= 1);
});

test("adding one same-name skill leaves the existing row exactly paired", () => {
  const existing = skill(1, ["reason"]);
  const added = skill(2, ["passion"]);
  const { left, right, diff } = alignAndDiff(
    { general: { "白兵": existing } },
    { general: { "白兵": added, "白兵 #2": existing } }
  );

  assert.deepEqual(left.general["白兵"], right.general["白兵"]);
  assert.equal(left.general["白兵 #2"], undefined);
  assert.deepEqual(right.general["白兵 #2"], added);
  assert.ok(diff.length >= 1);
});

test("removing one same-name skill leaves the surviving row exactly paired", () => {
  const existing = skill(1, ["reason"]);
  const removed = skill(2, ["passion"]);
  const { left, right, diff } = alignAndDiff(
    { general: { "白兵": removed, "白兵 #2": existing } },
    { general: { "白兵": existing } }
  );

  assert.deepEqual(left.general["白兵"], right.general["白兵"]);
  assert.deepEqual(left.general["白兵 #2"], removed);
  assert.equal(right.general["白兵 #2"], undefined);
  assert.ok(diff.length >= 1);
});

test("suit-only change remains a single field difference", () => {
  const { diff } = alignAndDiff(
    { general: { "白兵": skill(1, ["reason"]) } },
    { general: { "白兵": skill(1, ["passion"]) } }
  );

  assert.equal(diff.length, 1);
});

test("level-only change remains a single field difference", () => {
  const { diff } = alignAndDiff(
    { general: { "白兵": skill(1, ["reason"]) } },
    { general: { "白兵": skill(2, ["reason"]) } }
  );

  assert.equal(diff.length, 1);
});

test("same-name outfits pair the unchanged sibling before description changes", () => {
  const unchanged = {
    category: "ウェポン",
    name: "単分子ブレード",
    attack: "S+5",
    description: "same"
  };
  const before = { ...unchanged, attack: "S+8", description: "before" };
  const after = { ...before, description: "after" };
  const identity = "ウェポン:単分子ブレード";
  const { left, right, diff } = alignAndDiff(
    { outfits: { [identity]: unchanged, [`${identity} #2`]: before } },
    { outfits: { [identity]: after, [`${identity} #2`]: unchanged } }
  );

  assert.deepEqual(left.outfits[identity], right.outfits[identity]);
  assert.notDeepEqual(left.outfits[`${identity} #2`], right.outfits[`${identity} #2`]);
  assert.equal(diff.length, 1);
});

test("legacy top-level electronic_control is ignored without mutating ofc_details", () => {
  const source = {
    outfits: [
      {
        name: "サンプル",
        electronic_control: "legacy-value",
        ofc_details: { electronic_control: "current-value" }
      },
      {
        name: "旧形式のみ",
        electronic_control: "legacy-only",
        ofc_details: {}
      }
    ]
  };

  const cleaned = stripLegacyArchiveOutfitElectronicControl(source);

  assert.equal("electronic_control" in cleaned.outfits[0], false);
  assert.equal(cleaned.outfits[0].ofc_details.electronic_control, "current-value");
  assert.equal("electronic_control" in cleaned.outfits[1], false);
  assert.equal(source.outfits[0].electronic_control, "legacy-value");
});
