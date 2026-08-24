import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  renderStyleCards,
  renderAbilityCards
} from "../js/sheet-character-renderer.js";

test("style renderer preserves three-card ids, marks, attributes and escaping", () => {
  const html = renderStyleCards({
    styleData: [{ name: "カブキ" }, { name: '<script>alert("x")</script>' }],
    utsuwaAttributes: [{ name: "器物" }]
  });

  for (let i = 1; i <= 3; i++) {
    assert.match(html, new RegExp(`id="style-${i}"`));
    assert.match(html, new RegExp(`id="style-${i}-mark"`));
    assert.match(html, new RegExp(`id="style-${i}-attribute-wrap" hidden`));
    assert.match(html, new RegExp(`id="divine-${i}"`));
    assert.match(html, new RegExp(`id="divine-${i}-yomi"`));
  }
  assert.match(html, /<option>◎●<\/option>/);
  assert.match(html, /<option>器物<\/option>/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
});

test("ability renderer preserves ability/control/current/mod/final and CS contracts", () => {
  const html = renderAbilityCards([
    ["reason", "理性", "REASON"],
    ["passion", "感情", "PASSION"],
    ["life", "生命", "LIFE"],
    ["mundane", "外界", "MUNDANE"]
  ]);

  for (const key of ["reason", "passion", "life", "mundane"]) {
    for (const suffix of ["base", "control-base", "mod", "control-mod", "final", "control-final"]) {
      assert.match(html, new RegExp(`id="${key}-${suffix}"`));
    }
  }
  assert.match(html, /id="cs-base"/);
  assert.match(html, /id="cs-mod"/);
  assert.match(html, /id="cs-final"/);
  assert.equal((html.match(/class="ability-card ability-matrix"/g) || []).length, 4);
});

test("character renderer stays DOM-free and sheet delegates only markup generation", async () => {
  const rendererSource = await readFile(new URL("../js/sheet-character-renderer.js", import.meta.url), "utf8");
  const sheetSource = await readFile(new URL("../js/sheet.js", import.meta.url), "utf8");

  assert.doesNotMatch(rendererSource, /document\.|window\.|supabase|localStorage|sessionStorage|addEventListener/);
  assert.match(sheetSource, /sheet-character-renderer\.js\?v=1/);
  assert.match(sheetSource, /renderStyleCards\(/);
  assert.match(sheetSource, /renderAbilityCards\(ABILITIES\)/);
  assert.match(sheetSource, /function toggleAttribute\(/);
  assert.match(sheetSource, /function updateDivines\(/);
});
