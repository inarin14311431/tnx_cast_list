import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { STYLE_DATA } from "../js/style-data.js";
import { buildStylePresentation } from "../js/sheet-style-presentation.js";

test("style presentation resolves divine names and yomi from current style data", () => {
  const result = buildStylePresentation({
    slots: [{ name: "カブキ" }, { name: "カタナ" }, { name: "ウツワ", attribute: "雷神" }],
    styleData: STYLE_DATA
  });

  assert.deepEqual(result.divines, [
    { name: "チャイ", yomi: "チャイ" },
    { name: "死の舞踏", yomi: "ダンス・マカブル" },
    { name: "神意", yomi: "ミラクル" }
  ]);
  assert.equal(result.warning, "");
});

test("missing or unknown styles preserve the current unselected presentation and warning", () => {
  const result = buildStylePresentation({
    slots: [{ name: "カブキ" }, { name: "UNKNOWN" }, {}],
    styleData: STYLE_DATA
  });

  assert.deepEqual(result.divines, [
    { name: "チャイ", yomi: "チャイ" },
    { name: "未選択", yomi: "" },
    { name: "未選択", yomi: "" }
  ]);
  assert.equal(result.warning, "3枠すべてのスタイルを選択してください。");
});

test("warning depends on three non-empty slot selections, matching the classic editor contract", () => {
  assert.equal(buildStylePresentation({
    slots: [{ name: "カブキ" }, { name: "カタナ" }, { name: "カブト" }],
    styleData: STYLE_DATA
  }).warning, "");

  assert.equal(buildStylePresentation({
    slots: [{ name: "カブキ" }, { name: "カタナ" }, { name: "" }],
    styleData: STYLE_DATA
  }).warning, "3枠すべてのスタイルを選択してください。");
});

test("style presentation helper remains DOM-free and sheet delegates display calculation", async () => {
  const helperSource = await readFile(new URL("../js/sheet-style-presentation.js", import.meta.url), "utf8");
  const sheetSource = await readFile(new URL("../js/sheet.js", import.meta.url), "utf8");

  assert.doesNotMatch(helperSource, /document\.|window\.|supabase|localStorage|sessionStorage|addEventListener/);
  assert.match(sheetSource, /sheet-style-presentation\.js\?v=1/);
  assert.match(sheetSource, /buildStylePresentation\(/);
  assert.match(sheetSource, /function updateDivines\(/);
  assert.match(sheetSource, /function adjustBaseline\(/);
});
