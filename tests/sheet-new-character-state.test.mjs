import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildNewCharacterSkills } from "../js/sheet-new-character-state.js";
import { createBlankSkill, createSkillRow } from "../js/sheet-row-factory.js";

const SUITS = ["reason", "passion", "life", "mundane"];
const MASTER = [
  ["医療", "reason", "general"], ["射撃", "reason", "general"], ["知覚", "reason", "general"], ["電脳", "reason", "general"], ["製作：", "reason", "proper"],
  ["心理", "passion", "general"], ["自我", "passion", "general"], ["交渉", "passion", "general"], ["芸術：", "passion", "proper"],
  ["運動", "life", "general"], ["回避", "life", "general"], ["白兵", "life", "general"], ["操縦：", "life", "proper"],
  ["信用", "mundane", "general"], ["圧力", "mundane", "general"], ["隠密", "mundane", "general"]
];
const BLANK_COLUMNS = ["left", "left", "right", "right"];
let key = 0;
const makeSkill = (category, options = {}) => createBlankSkill(category, { key: `k${++key}`, ...options });
const makeRow = (category, overrides = {}, options = {}) => createSkillRow(category, overrides, { key: `r${++key}`, ...options });
const build = () => buildNewCharacterSkills({
  masterRows: MASTER,
  suits: SUITS,
  blankColumns: BLANK_COLUMNS,
  createBlankSkill: makeSkill,
  createSkillRow: makeRow
});

test("new character state preserves fixed general, blank, social and connection counts", () => {
  key = 0;
  const rows = build();
  assert.equal(rows.filter(row => row.category === "general" && row._fixedMaster).length, 16);
  assert.equal(rows.filter(row => row.category === "general" && row._blankSlot).length, 4);
  assert.equal(rows.filter(row => row.category === "social").length, 4);
  assert.equal(rows.filter(row => row.category === "connection").length, 3);
  assert.equal(rows.length, 27);
});

test("new character state preserves canonical blank columns and starter names", () => {
  key = 0;
  const rows = build();
  assert.deepEqual(rows.filter(row => row._blankSlot).map(row => row._slotColumn), BLANK_COLUMNS);
  assert.deepEqual(rows.filter(row => row.category === "social").map(row => row.name), ["社会：N◎VA", "社会：", "社会：", "社会："]);
  assert.deepEqual(rows.filter(row => row.category === "connection").map(row => row.name), ["コネ：", "コネ：", "コネ："]);
});

test("fixed general rows preserve starting suit and level semantics", () => {
  key = 0;
  const rows = build();
  const medical = rows.find(row => row.name === "医療");
  const craft = rows.find(row => row.name === "製作：");
  assert.equal(medical.reason, true);
  assert.equal(medical.level, 1);
  assert.equal(medical.skill_kind, "general");
  assert.equal(craft.level, 0);
  assert.equal(craft.skill_kind, "proper");
  assert.equal(craft.reason, false);
});

test("new character state uses shared row and collection factories while remaining DOM-free", async () => {
  const helperSource = await readFile(new URL("../js/sheet-new-character-state.js", import.meta.url), "utf8");
  const sheetSource = await readFile(new URL("../js/sheet.js", import.meta.url), "utf8");
  assert.doesNotMatch(helperSource, /document\.|window\.|supabase|localStorage|sessionStorage|addEventListener/);
  assert.match(helperSource, /createSkillRow as defaultCreateSkillRow/);
  assert.match(helperSource, /createSkillRow\("general"/);
  assert.match(helperSource, /appendRows/);
  assert.doesNotMatch(helperSource, /\.push\(/);
  assert.match(sheetSource, /sheet-new-character-state\.js\?v=1/);
  assert.match(sheetSource, /buildNewCharacterSkills\(/);
});
