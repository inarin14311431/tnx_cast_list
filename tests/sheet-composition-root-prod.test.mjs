import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("production PC editor modules are owned by the sheet composition root", async () => {
  const [html, app] = await Promise.all([read("sheet.html"), read("js/sheet-app.js")]);
  assert.match(html, /<script type="module" src="\.\/js\/sheet-app\.js\?v=2"><\/script>/);
  for (const legacyEntry of [
    "sheet.js",
    "privileged-tools-bootstrap.js",
    "sheet-image.js",
    "sheet-personal-data.js",
    "ui-v25.js",
    "sheet-features.js",
    "experience.js",
    "style-skill-separators.js",
    "sheet-multiline-fields-v3.js",
    "outfit-ofc-fields.js",
    "sheet-combos.js",
    "sheet-snapshots.js"
  ]) {
    assert.doesNotMatch(html, new RegExp(`<script[^>]+src=["']\\./js/${legacyEntry.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  }
  for (const runtimeEntry of [
    "./sheet.js?v=114",
    "./privileged-tools-bootstrap.js?v=1",
    "./sheet-image.js?v=104",
    "./sheet-personal-data.js?v=101",
    "./sheet-skill-ui.js?v=1",
    "./sheet-features.js?v=103",
    "./experience.js?v=101",
    "./style-skill-separators.js?v=7",
    "./sheet-multiline-fields.js?v=1",
    "./outfit-ofc-fields.js?v=4",
    "./sheet-combos.js?v=6",
    "./sheet-snapshots.js?v=1"
  ]) assert.match(app, new RegExp(runtimeEntry.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});
