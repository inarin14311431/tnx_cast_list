import test from "node:test";
import assert from "node:assert/strict";
import { STYLE_DETAIL_PREFIX, normalizeStyleSkillRow } from "../js/sheet-mobile-style-normalizer.js";

test("normalizes structured mobile style detail payload", () => {
  const row = {
    description: STYLE_DETAIL_PREFIX + JSON.stringify({
      skill: "白兵",
      limit: "2",
      timing: "メジャー",
      target: "単体",
      range: "至近",
      difficulty: "なし",
      confrontation: "＜回避＞",
      page: "123",
      description: "本文"
    })
  };
  assert.deepEqual(normalizeStyleSkillRow(row), {
    skill: "白兵",
    limit: "2",
    timing: "メジャー",
    target: "単体",
    range: "至近",
    difficulty: "なし",
    confrontation: "＜回避＞",
    page: "123",
    description: "本文"
  });
});

test("parses legacy labeled text without losing description", () => {
  const row = { description: "技能：射撃　使用上限：1シーン　タイミング：メジャー　対象：単体　射程：武器　目標値：なし　対決：＜回避＞　参照Ｐ：45　解説：旧データ本文" };
  const detail = normalizeStyleSkillRow(row);
  assert.equal(detail.skill, "射撃");
  assert.equal(detail.limit, "1シーン");
  assert.equal(detail.timing, "メジャー");
  assert.equal(detail.target, "単体");
  assert.equal(detail.range, "武器");
  assert.equal(detail.page, "45");
  assert.equal(detail.description, "旧データ本文");
});

test("falls back to database columns when legacy text lacks fields", () => {
  const detail = normalizeStyleSkillRow({
    description: "自由記述のみ",
    timing: "オートアクション",
    target: "自身",
    range: "至近"
  });
  assert.equal(detail.description, "自由記述のみ");
  assert.equal(detail.timing, "オートアクション");
  assert.equal(detail.target, "自身");
  assert.equal(detail.range, "至近");
});

test("malformed structured payload is preserved instead of erased", () => {
  const source = STYLE_DETAIL_PREFIX + "{broken";
  const detail = normalizeStyleSkillRow({ description: source });
  assert.equal(detail.description, source);
});
