import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { countGeneralSkillColumns, chooseGeneralSkillColumn } from "../js/sheet-general-column.js";

test("general row counts follow the renderer split after 交渉", () => {
  const rows = ["医療", "射撃", "心理", "交渉", "芸術：", "運動", "回避"].map(name => ({ name }));
  assert.deepEqual(countGeneralSkillColumns(rows), { left: 4, right: 3 });
});

test("missing split marker keeps all rows in the first column", () => {
  assert.deepEqual(countGeneralSkillColumns([{ name: "自由技能" }, { name: "別技能" }]), { left: 2, right: 0 });
  assert.deepEqual(countGeneralSkillColumns(), { left: 0, right: 0 });
});

test("equal counts choose left", () => {
  assert.equal(chooseGeneralSkillColumn({ left: 10, right: 10 }), "left");
});

test("fewer left rows choose left", () => {
  assert.equal(chooseGeneralSkillColumn({ left: 8, right: 9 }), "left");
});

test("fewer right rows choose right", () => {
  assert.equal(chooseGeneralSkillColumn({ left: 11, right: 9 }), "right");
});

test("missing and string counts are normalized", () => {
  assert.equal(chooseGeneralSkillColumn(), "left");
  assert.equal(chooseGeneralSkillColumn({ left: "12", right: "11" }), "right");
});

test("general column helper stays DOM-free and sheet delegates counting and decision", async () => {
  const helperSource = await readFile(new URL("../js/sheet-general-column.js", import.meta.url), "utf8");
  const sheetSource = await readFile(new URL("../js/sheet.js", import.meta.url), "utf8");
  assert.doesNotMatch(helperSource, /document\.|window\.|supabase|localStorage|sessionStorage|addEventListener/);
  assert.match(sheetSource, /sheet-general-column\.js\?v=1/);
  assert.match(sheetSource, /countGeneralSkillColumns\(mergedGeneral\(\)\)/);
  assert.match(sheetSource, /chooseGeneralSkillColumn\(counts\)/);
  assert.doesNotMatch(sheetSource, /general-skill-column--first tbody tr/);
  assert.doesNotMatch(sheetSource, /counts\.left <= counts\.right \? "left" : "right"/);
});
