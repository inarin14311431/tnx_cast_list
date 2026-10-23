import { actShowcaseCssEntry, actShowcaseCss, stripSceneScope } from "./helpers/act-showcase-css.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { assertVersionedMatch } from "./helpers/cache-version.mjs";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

test("poster-v2 keeps the published background on the opening hero only", async () => {
  const entry = await actShowcaseCssEntry();
  const posterCss = stripSceneScope(await actShowcaseCss("act-showcase-poster-v2"));
  const overrideCss = stripSceneScope(await actShowcaseCss("act-showcase-top-background-only"));

  assertVersionedMatch(entry, /act-showcase-top-background-only\.css\?v=VERSION/);
  assert.match(posterCss, /\.scene-opening:before\{[^}]*var\(--showcase-background\)/);
  assert.match(overrideCss, /showcase-poster-v2-ready\.has-showcase-background \.ambient-stage::before\s*\{[^}]*display:\s*none/);
  assert.match(overrideCss, /\.poster-v2-board::before\s*\{[^}]*background-image:\s*linear-gradient/);
  assert.doesNotMatch(overrideCss, /\.poster-v2-board::before\s*\{[^}]*var\(--showcase-background\)/);
});
