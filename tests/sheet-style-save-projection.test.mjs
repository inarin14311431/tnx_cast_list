import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildStyleSaveRows } from "../js/sheet-style-save-projection.js";

const styleData = [
  { name: "カブキ", divine: "チャイ", divineYomi: "チャイ" },
  { name: "カタナ", divine: "死の舞踏", divineYomi: "ダンス・マカブル" },
  { name: "ウツワ", divine: "神意", divineYomi: "ミラクル" }
];

test("style save projection preserves name mark attribute divine and yomi", () => {
  assert.deepEqual(buildStyleSaveRows({
    slots: [
      { name: "カタナ", mark: "◎", attribute: "" },
      { name: "ウツワ", mark: "●", attribute: "カブト" },
      { name: "カブキ", mark: "", attribute: "" }
    ],
    styleData
  }), [
    { name: "カタナ", mark: "◎", attribute: "", divine: "死の舞踏", divineYomi: "ダンス・マカブル" },
    { name: "ウツワ", mark: "●", attribute: "カブト", divine: "神意", divineYomi: "ミラクル" },
    { name: "カブキ", mark: "", attribute: "", divine: "チャイ", divineYomi: "チャイ" }
  ]);
});

test("blank and unknown slots keep the three-row save contract", () => {
  assert.deepEqual(buildStyleSaveRows({ slots: [{ name: "UNKNOWN" }], styleData }), [
    { name: "UNKNOWN", mark: "", attribute: "", divine: "", divineYomi: "" },
    { name: "", mark: "", attribute: "", divine: "", divineYomi: "" },
    { name: "", mark: "", attribute: "", divine: "", divineYomi: "" }
  ]);
});

test("divine yomi falls back to divine and count remains explicit", () => {
  assert.deepEqual(buildStyleSaveRows({
    slots: [{ name: "TEST", mark: "◎" }, { name: "EXTRA" }],
    styleData: [{ name: "TEST", divine: "DIVINE" }],
    count: 1
  }), [
    { name: "TEST", mark: "◎", attribute: "", divine: "DIVINE", divineYomi: "DIVINE" }
  ]);
});

test("style save projection remains DOM-free and sheet delegates save mapping", async () => {
  const helperSource = await readFile(new URL("../js/sheet-style-save-projection.js", import.meta.url), "utf8");
  const sheetSource = await readFile(new URL("../js/sheet.js", import.meta.url), "utf8");
  assert.doesNotMatch(helperSource, /document\.|window\.|supabase|localStorage|sessionStorage|addEventListener/);
  assert.match(sheetSource, /sheet-style-save-projection\.js\?v=1/);
  assert.match(sheetSource, /buildStyleSaveRows/);
  assert.doesNotMatch(sheetSource, /const styles = \[1, 2, 3\]\.map\(i => \{/);
});
