import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");
const [layout, polish, fitCss, entry] = await Promise.all([
  read("js/act-showcase-cinematic-layout-v2.js"),
  read("js/act-showcase-cinematic-polish.js"),
  read("css-next/pages/act-showcase-cinematic-fit.css"),
  read("css-next/pages/act-showcase-entry.css")
]);

test("cinematic JS classifies text but does not own font metrics", () => {
  const cinematicJs = `${layout}\n${polish}`;
  assert.doesNotMatch(cinematicJs, /\.style\.(?:fontSize|lineHeight|letterSpacing|whiteSpace)\b/);
  assert.doesNotMatch(cinematicJs, /setAttribute\(\s*["']style["']/);
  assert.doesNotMatch(layout, /getComputedStyle\(tagline\)|tagline\.scrollWidth|tagline\.clientWidth/);
  assert.match(polish, /kind === "tagline"/);
  assert.match(polish, /showcase-fit-tagline/);
  assert.match(polish, /fit\(element, "tagline"\)/);
});

test("cinematic tagline sizing is owned by CSS data-fit states", () => {
  assert.match(entry, /act-showcase-cinematic-fit\.css\?v=1/);
  for (const fit of ["medium", "long", "xlong"]) {
    const selector = new RegExp(`\\.showcase-fit-tagline\\[data-fit=["']${fit}["']\\]\\s*\\{[\\s\\S]*?font-size`);
    assert.match(fitCss, selector);
  }
});

test("fit CSS loads after the base cinematic sizing and before final theme contracts", () => {
  const cinematic = entry.indexOf("act-showcase-cinematic-v2.css");
  const fit = entry.indexOf("act-showcase-cinematic-fit.css");
  const phase = entry.indexOf("act-showcase-theme-phase-contract.css");
  assert.ok(cinematic >= 0 && fit > cinematic, "fit CSS must follow cinematic-v2");
  assert.ok(phase > fit, "theme phase contract must remain the final override layer");
});
