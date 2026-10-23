import { actShowcaseCss } from "./helpers/act-showcase-css.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

async function exists(path) {
  try { await access(new URL(`../${path}`, import.meta.url)); return true; } catch { return false; }
}

test("retired reduced-motion browser API bridge is absent from the cinematic route", async () => {
  const [html, bootstrap] = await Promise.all([
    read("act-showcase.html"),
    read("js/act-showcase-bootstrap.js")
  ]);
  assert.equal(await exists("js/act-showcase-reduced-motion-sequence-bridge.js"), false);
  assert.doesNotMatch(html, /reduced-motion-sequence-bridge/);
  assert.doesNotMatch(bootstrap, /reduced-motion-sequence-bridge/);
  assert.doesNotMatch(bootstrap, /window\.matchMedia\s*=/);
});

test("NeoTokyo keeps the cinematic sequence under reduced motion while CSS suppresses physical animation", async () => {
  const [sequence, css] = await Promise.all([
    read("js/act-showcase-neotokyo.js"),
    actShowcaseCss("act-showcase-neotokyo")
  ]);
  assert.match(sequence, /prefers-reduced-motion: reduce/);
  assert.match(
    sequence,
    /if \(prefersReducedMotion\(\)\) \{\s*document\.body\.classList\.add\("showcase-neotokyo-reduced"\);\s*\}/
  );
  assert.doesNotMatch(
    sequence,
    /if \(prefersReducedMotion\(\)\) \{\s*document\.body\.classList\.add\("showcase-neotokyo-reduced"\);\s*return;/
  );
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(sequence, /window\.matchMedia\s*=/);
});

test("normal cinematic sequence still contains every narrative phase", async () => {
  const sequence = await read("js/act-showcase-neotokyo.js");
  const { INTRO_SCENES } = await import("../js/act-showcase-neotokyo.js");
  // every intro frame is in the table and played for reduced motion too (the loop has no reduced-motion branch)
  assert.deepEqual(INTRO_SCENES.map(scene => scene.frame), ["loading", "title", "trailer", "handout-assign", "ready"]);
  const loop = sequence.slice(sequence.indexOf("for (const scene of INTRO_SCENES)"), sequence.indexOf("} finally {"));
  assert.match(loop, /await scene\.patterns\[DEFAULT_SCENE_PATTERN\]\(state, model, scene\)/);
  assert.doesNotMatch(loop, /prefersReducedMotion|showcase-neotokyo-reduced/);
  assert.match(sequence, /await showHandoutAndAssign\(state, model\.casts\[index\], index, model\.casts, scene\)/);
});
