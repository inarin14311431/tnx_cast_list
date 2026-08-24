import test from "node:test";
import assert from "node:assert/strict";
import {
  GENERAL_MASTER_ROWS,
  GENERAL_BLANK_SLOT_COLUMNS,
  GENERAL_MOBILE_ORDER,
  MUTABLE_GENERAL_PREFIXES,
  STARRED_GENERAL_NAMES
} from "../js/general-skill-catalog.js";

test("general skill catalog owns the canonical sixteen master skills", () => {
  assert.equal(GENERAL_MASTER_ROWS.length, 16);
  assert.deepEqual(GENERAL_MASTER_ROWS.map(([name]) => name), [
    "医療", "射撃", "知覚", "電脳", "製作：",
    "心理", "自我", "交渉", "芸術：",
    "運動", "回避", "白兵", "操縦：",
    "信用", "圧力", "隠密"
  ]);
  assert.deepEqual(GENERAL_BLANK_SLOT_COLUMNS, ["left", "left", "right", "right"]);
});

test("mobile order contains every canonical general skill exactly once", () => {
  assert.equal(GENERAL_MOBILE_ORDER.length, 16);
  assert.deepEqual(new Set(GENERAL_MOBILE_ORDER), new Set(GENERAL_MASTER_ROWS.map(([name]) => name)));
});

test("mutable prefixes are derived from proper general master rows", () => {
  assert.deepEqual(MUTABLE_GENERAL_PREFIXES, ["製作：", "芸術：", "操縦："]);
});

test("legacy display stars cover the canonical eight skills including driving", () => {
  assert.deepEqual([...STARRED_GENERAL_NAMES], ["射撃", "心理", "自我", "回避", "操縦：", "白兵", "信用", "圧力"]);
  assert.equal(STARRED_GENERAL_NAMES.size, 8);
  for (const name of STARRED_GENERAL_NAMES) {
    assert.ok(GENERAL_MASTER_ROWS.some(([masterName]) => masterName === name));
  }
});
