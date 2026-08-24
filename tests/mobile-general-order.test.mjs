import test from "node:test";
import assert from "node:assert/strict";
import { GENERAL_MASTER_ROWS, GENERAL_MOBILE_ORDER } from "../js/general-skill-catalog.js";

test("mobile general skills follow canonical single-column order", () => {
  const expected = GENERAL_MASTER_ROWS.map(([name]) => name);
  assert.deepEqual(GENERAL_MOBILE_ORDER, expected);
  assert.deepEqual(GENERAL_MOBILE_ORDER, [
    "医療", "射撃", "知覚", "電脳", "製作：", "心理", "自我", "交渉",
    "芸術：", "運動", "回避", "白兵", "操縦：", "信用", "圧力", "隠密"
  ]);
});
