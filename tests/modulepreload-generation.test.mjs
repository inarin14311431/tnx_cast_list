import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { assertVersionedMatch } from "./helpers/cache-version.mjs";

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
  assertVersionedMatch(block, /href="\.\/js\/cast-data-store\.js\?v=VERSION"/);
  assert.equal(block.match(/cast-data-store\.js/g)?.length, 1, "cast-data-store.js must appear exactly once");
});

test("sheet.html preloads statically reachable modules but not dynamic-import-only ones", () => {
  const block = modulepreloadBlock(sheetHtml);
  assertVersionedMatch(block, /href="\.\/js\/help-ui\.js\?v=VERSION"/);
  assert.doesNotMatch(block, /character-sheet-source\.js/);
});

test("generator explicitly documents that dynamic import() is excluded", () => {
  assert.match(generatorSource, /dynamic .*import\(\.\.\.\).* (?:are )?(?:is )?intentionally excluded/i);
});

// js/act-showcase-bootstrap.js loads 15 modules one after another with a top-level `await import(...)`; the marker on its first line
// makes the generator list them (and what they import statically), so they are fetched in parallel. Nothing else is affected.
const showcaseHtml = await readFile(path.join(root, "act-showcase.html"), "utf8");
const bootstrapSource = await readFile(path.join(root, "js/act-showcase-bootstrap.js"), "utf8");

test("act-showcase.html preloads every module the bootstrap imports one after another, and what the page needs from them", () => {
  const block = modulepreloadBlock(showcaseHtml);
  const chain = [...bootstrapSource.matchAll(/^\s*await import\("\.\/([^"?]+)\?v=([0-9a-f]{8})"\);/gm)];
  assert.equal(chain.length, 15, "the bootstrap's chain of imports");
  for (const [, file, version] of chain) assert.ok(block.includes(`href="./js/${file}?v=${version}"`), `${file} is not preloaded`);
  // reached only through the chain: the page's own static imports (the scenes the intro plays, the ready pattern's helpers)
  for (const file of ["act-showcase-neotokyo.js", "act-showcase-ready-b.js", "act-showcase-title-b.js", "act-showcase-trailer-b.js", "act-showcase-scenes.js", "act-showcase-visual-caption.js"]) {
    assert.match(block, new RegExp(`href="\\./js/${file.replace(".", "\\.")}\\?v=[0-9a-f]{8}"`), `${file} is not preloaded`);
  }
});

test("the eager marker is opt-in: only an entry with the marker on its first lines has its top-level dynamic imports preloaded", () => {
  assert.match(bootstrapSource.split("\n").slice(0, 3).join("\n"), /^\/\/ modulepreload: eager$/m);
  assert.match(generatorSource, /modulepreload:\s*eager/);
  assert.match(generatorSource, /eagerDynamicSpecifiers/);
  // pages without the marker keep the old rule (sheet.html's lazy import stays unpreloaded: see above)
  assert.doesNotMatch(sheetHtml, /character-sheet-source\.js/);
});
