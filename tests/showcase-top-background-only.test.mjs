import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

test("poster-v2 keeps the published background on the opening hero only", async () => {
  const entry = await read("css-next/pages/act-showcase-entry.css");
  const posterCss = await read("css-next/pages/act-showcase-poster-v2.css");
  const overrideCss = await read("css-next/pages/act-showcase-top-background-only.css");

  assert.match(entry, /act-showcase-top-background-only\.css\?v=\d+/);
  assert.match(posterCss, /\.scene-opening:before\{[^}]*var\(--showcase-background\)/);
  assert.match(overrideCss, /showcase-poster-v2-ready\.has-showcase-background \.ambient-stage::before\s*\{[^}]*display:\s*none/);
  assert.match(overrideCss, /\.poster-v2-board::before\s*\{[^}]*background-image:\s*linear-gradient/);
  assert.doesNotMatch(overrideCss, /\.poster-v2-board::before\s*\{[^}]*var\(--showcase-background\)/);
});
