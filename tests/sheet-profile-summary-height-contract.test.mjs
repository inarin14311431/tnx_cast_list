import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("profile summary field displays two full text lines", async () => {
  const [html, editorCss, entryCss] = await Promise.all([
    read("sheet.html"),
    read("css-next/editor/editor.css"),
    read("css-next/pages/sheet-entry.css")
  ]);

  assert.match(html, /<textarea id="summary" rows="2"><\/textarea>/);
  assert.match(
    editorCss,
    /\.profile-summary-field textarea\s*\{[^}]*min-height:\s*72px;[^}]*height:\s*72px;[^}]*line-height:\s*1\.5;/
  );
  assert.match(entryCss, /editor\/editor\.css\?v=30/);
});
