import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatorSource = await readFile(path.join(root, "scripts/generate-modulepreload.mjs"), "utf8");
const castHtml = await readFile(path.join(root, "cast.html"), "utf8");
const sheetHtml = await readFile(path.join(root, "sheet.html"), "utf8");

function modulepreloadBlock(html) {
  const start = html.indexOf("<!-- modulepreload:start -->");
  const end = html.indexOf("<!-- modulepreload:end -->");
  assert.notEqual(start, -1, "modulepreload:start marker must exist");
  assert.notEqual(end, -1, "modulepreload:end marker must exist");
  return html.slice(start, end);
}

test("checked-in modulepreload links are up to date with the current import graph", () => {
  const result = spawnSync(process.execPath, ["scripts/generate-modulepreload.mjs", "--check"], {
    cwd: root,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test("cast.html preloads the unified single-version cast-data-store.js used across its module graph", () => {
  const block = modulepreloadBlock(castHtml);
  assert.match(block, /href="\.\/js\/cast-data-store\.js\?v=2"/);
  assert.equal(block.match(/cast-data-store\.js/g)?.length, 1, "cast-data-store.js must appear exactly once");
});

test("sheet.html preloads statically reachable modules but not dynamic-import-only ones", () => {
  const block = modulepreloadBlock(sheetHtml);
  assert.match(block, /href="\.\/js\/help-ui\.js\?v=11"/);
  assert.doesNotMatch(block, /character-sheet-source\.js/);
});

test("generator explicitly documents that dynamic import() is excluded", () => {
  assert.match(generatorSource, /dynamic .*import\(\.\.\.\).* (?:are )?(?:is )?intentionally excluded/i);
});
