import { actShowcaseCssEntry, actShowcaseCss } from "./helpers/act-showcase-css.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

test("poster-v2 keeps the published background on the opening hero only", async () => {
  const entry = await actShowcaseCssEntry();
  const posterCss = await actShowcaseCss("act-showcase-poster-v2");
  const overrideCss = await actShowcaseCss("act-showcase-top-background-only");

  assert.match(entry, /act-showcase-top-background-only\.css\?v=\d+/);
  assert.match(posterCss, /\.scene-opening:before\{[^}]*var\(--showcase-background\)/);
  assert.match(overrideCss, /showcase-poster-v2-ready\.has-showcase-background \.ambient-stage::before\s*\{[^}]*display:\s*none/);
  assert.match(overrideCss, /\.poster-v2-board::before\s*\{[^}]*background-image:\s*linear-gradient/);
  assert.doesNotMatch(overrideCss, /\.poster-v2-board::before\s*\{[^}]*var\(--showcase-background\)/);
});
