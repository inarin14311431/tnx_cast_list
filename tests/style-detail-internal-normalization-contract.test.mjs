import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("style detail compatibility repair is marked as internal", async () => {
  const source = await read("js/style-skill-detail-integrity.js");
  assert.match(source, /tnxInternalNormalization/);
  assert.match(source, /new CustomEvent\("input"/);
});

test("internal style normalization does not update model or dirty state", async () => {
  const [rows, editor] = await Promise.all([
    read("js/sheet-row-interactions.js"),
    read("js/sheet-editor-interactions.js")
  ]);
  assert.match(rows, /isInternalNormalization\(event\)/);
  assert.match(rows, /if \(isInternalNormalization\(event\)\) return;/);
  assert.match(editor, /isInternalNormalization\(event\)/);
  assert.match(editor, /isLoading\(\) \|\| isInternalNormalization\(event\)/);
});
