import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

function read(relativePath) {
  return fs.readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("acts app routes remote reads and writes through the shared timeout helper", () => {
  const source = read("../js/acts-app.js");
  assert.match(source, /from "\.\/async-timeout\.js\?v=1"/);
  assert.ok((source.match(/withRequestTimeout\(/g) ?? []).length >= 7);
  for (const operation of [
    '.from("characters")',
    '.from("act_participants")',
    '.from("character_experience_spending")'
  ]) {
    assert.match(source, new RegExp(operation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("acts writes use one busy lifecycle and restore controls in finally", () => {
  const source = read("../js/acts-app.js");
  assert.match(source, /async function runBusyAction\(task\)/);
  assert.match(source, /setBusy\(true\);/);
  assert.match(source, /finally\s*\{\s*setBusy\(false\);\s*\}/);
  assert.match(source, /if\s*\(state\.busy\)\s*return;/);
  assert.match(source, /button\.disabled\s*=\s*value/);
});
