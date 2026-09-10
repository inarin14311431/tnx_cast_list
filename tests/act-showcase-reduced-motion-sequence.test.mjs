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
    read("css-next/pages/act-showcase-neotokyo.css")
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
  assert.match(sequence, /await showOpening\(state\)/);
  assert.match(sequence, /await showActTitle\(state, model\)/);
  assert.match(sequence, /await showTrailer\(state, model\)/);
  assert.match(sequence, /await showHandoutAndAssign/);
  assert.match(sequence, /await showSummary\(state, model\)/);
});
