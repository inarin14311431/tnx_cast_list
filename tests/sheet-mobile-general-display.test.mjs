import test from "node:test";
import assert from "node:assert/strict";
import { mobileGeneralDisplayName } from "../js/sheet-mobile-general-display.js";

test("mobile general skill stars are presentation-only", () => {
  for (const name of ["射撃", "心理", "自我", "回避", "操縦：", "白兵", "信用", "圧力"]) {
    assert.equal(mobileGeneralDisplayName(name), `★${name}`);
  }
  assert.equal(mobileGeneralDisplayName("医療"), "医療");
  assert.equal(mobileGeneralDisplayName("社会：N◎VA"), "社会：N◎VA");
});
