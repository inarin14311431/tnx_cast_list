import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { collectStyleInputSnapshot, applyStyleInputSnapshot } from "../js/sheet-style-input-snapshot.js";

function fakeRoot(initial = {}) {
  const controls = new Map(Object.entries(initial).map(([selector, value]) => [selector, { value }]));
  return {
    querySelector(selector) { return controls.get(selector) || null; },
    value(selector) { return controls.get(selector)?.value; }
  };
}

test("style input snapshot preserves three slots", () => {
  const root = fakeRoot({
    "#style-1": "カブキ", "#style-1-mark": "◎", "#style-1-attribute": "",
    "#style-2": "ウツワ", "#style-2-mark": "●", "#style-2-attribute": "器物",
    "#style-3": "カタナ", "#style-3-mark": "", "#style-3-attribute": ""
  });
  assert.deepEqual(collectStyleInputSnapshot({ root }), [
    { name: "カブキ", mark: "◎", attribute: "" },
    { name: "ウツワ", mark: "●", attribute: "器物" },
    { name: "カタナ", mark: "", attribute: "" }
  ]);
});

test("style load application restores name mark and attribute", () => {
  const root = fakeRoot({
    "#style-1": "", "#style-1-mark": "", "#style-1-attribute": "",
    "#style-2": "", "#style-2-mark": "", "#style-2-attribute": "",
    "#style-3": "", "#style-3-mark": "", "#style-3-attribute": ""
  });
  applyStyleInputSnapshot({ root, data: {
    style_1: "カブト", style_1_mark: "◎", style_1_attribute: "",
    style_2: "ウツワ", style_2_mark: "●", style_2_attribute: "人間",
    style_3: "ニューロ", style_3_mark: "", style_3_attribute: ""
  }});
  assert.equal(root.value("#style-1"), "カブト");
  assert.equal(root.value("#style-1-mark"), "◎");
  assert.equal(root.value("#style-2-attribute"), "人間");
  assert.equal(root.value("#style-3"), "ニューロ");
});

test("classic sheet delegates style DOM collection and load application", async () => {
  const source = await readFile(new URL("../js/sheet.js", import.meta.url), "utf8");
  assert.match(source, /sheet-style-input-snapshot\.js\?v=1/);
  assert.match(source, /collectStyleInputSnapshot/);
  assert.match(source, /applyStyleInputSnapshot/);
  assert.doesNotMatch(source, /data\[`style_\$\{i\}`\]/);
});
