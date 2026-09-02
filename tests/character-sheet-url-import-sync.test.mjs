import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../js/character-sheet-url-import-sync.js", import.meta.url), "utf8");

test("successful Character Sheets URL import persists the canonical source URL into the editor field", () => {
  assert.match(source, /#character-sheets-import-url/);
  assert.match(source, /#character-sheet-url/);
  assert.match(source, /buildCharacterSheetEditUrl/);
  assert.match(source, /extractCharacterSheetKey/);
  assert.match(source, /dataset\.importing/);
  assert.match(source, /dataset\.state === "error"/);
  assert.match(source, /dispatchEvent\(new Event\("input"/);
});
