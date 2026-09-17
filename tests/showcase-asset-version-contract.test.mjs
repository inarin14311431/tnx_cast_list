import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");
const [cinematicHtml, bootstrap, entryCss, standardHtml, generatorHtml, generatorLoader] = await Promise.all([
  read("act-showcase.html"),
  read("js/act-showcase-bootstrap.js"),
  read("css-next/pages/act-showcase-entry.css"),
  read("act-showcase-standard.html"),
  read("showcase-generator.html"),
  read("js/showcase-generator-loader.js")
]);

const VERSION = "[A-Za-z0-9._-]+";

function assertUniquePaths(refs, label) {
  const paths = refs.map(ref => ref.replace(/\?v=.*$/, ""));
  assert.equal(new Set(paths).size, paths.length, `${label} must not load the same asset twice`);
}

test("cinematic HTML exposes one versioned CSS entry and one versioned bootstrap", () => {
  const css = [...cinematicHtml.matchAll(new RegExp(`href="(\\.\\/css-next\\/[^\"]+\\.css\\?v=${VERSION})"`, "g"))].map(match => match[1]);
  const scripts = [...cinematicHtml.matchAll(new RegExp(`src="(\\.\\/js\\/[^\"]+\\.js\\?v=${VERSION})"`, "g"))].map(match => match[1]);
  assert.deepEqual(css.map(ref => ref.replace(/\?v=.*$/, "")), ["./css-next/pages/act-showcase-entry.css"]);
  assert.deepEqual(scripts.map(ref => ref.replace(/\?v=.*$/, "")), ["./js/act-showcase-bootstrap.js"]);
});

test("cinematic bootstrap versions every local module exactly once", () => {
  const refs = [...bootstrap.matchAll(new RegExp(`import\\("(\\.\\/[^\"]+\\.js\\?v=${VERSION})"\\)`, "g"))].map(match => match[1]);
  assert.ok(refs.length >= 10, "cinematic bootstrap should expose the complete module chain");
  assertUniquePaths(refs, "cinematic bootstrap");
  assert.ok(refs[0].startsWith("./act-showcase-theme-runtime.js?v="), "theme runtime must initialize first");
  assert.ok(refs.some(ref => ref.startsWith("./act-showcase-cinematic-layout-v2.js?v=")));
  assert.ok(refs.some(ref => ref.startsWith("./act-showcase-page.js?v=")));
  assert.ok(!refs.some(ref => ref.includes("act-showcase-trailer-live-frame.js")), "obsolete inline trailer sizing must stay removed");
});

test("cinematic CSS entry versions every import and preserves final theme ownership order", () => {
  const refs = [...entryCss.matchAll(new RegExp(`@import "(\\.\\/[^\"]+\\.css\\?v=${VERSION})";`, "g"))].map(match => match[1]);
  assert.ok(refs.length >= 10, "cinematic CSS entry should expose the complete stylesheet chain");
  assertUniquePaths(refs, "cinematic CSS entry");

  const names = refs.map(ref => ref.replace(/^\.\//, "").replace(/\?v=.*$/, ""));
  const dedicated = names.indexOf("act-showcase-dedicated-themes.css");
  const surface = names.indexOf("act-showcase-theme-surface-system.css");
  const phase = names.indexOf("act-showcase-theme-phase-contract.css");
  const legibility = names.indexOf("act-showcase-theme-legibility.css");
  const scene = names.indexOf("act-showcase-theme-scene-contract.css");
  const emphasis = names.indexOf("act-showcase-visual-emphasis.css");
  assert.ok(dedicated >= 0 && surface > dedicated && phase > surface && legibility > phase && scene > legibility && emphasis > scene);
  assert.equal(emphasis, names.length - 1, "visual emphasis must remain the final cinematic stylesheet");
});

test("standard and generator entrypoints keep versioned local assets without pinning revision values", () => {
  assert.match(standardHtml, new RegExp(`act-showcase-theme-runtime\\.js\\?v=${VERSION}`));
  assert.match(standardHtml, new RegExp(`act-showcase-theme-surface-system\\.css\\?v=${VERSION}`));
  assert.match(standardHtml, new RegExp(`act-showcase-theme-legibility\\.css\\?v=${VERSION}`));
  assert.match(generatorHtml, new RegExp(`showcase-generator-loader\\.js\\?v=${VERSION}`));
  assert.match(generatorLoader, new RegExp(`showcase-dedicated-output\\.js\\?v=${VERSION}`));
});