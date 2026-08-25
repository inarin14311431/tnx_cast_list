import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("statistics bureau is available as a theme and archive entry point", async () => {
  const [registry, controller, index, themeCss] = await Promise.all([
    read("js/theme-registry.js"),
    read("js/css-next-theme.js"),
    read("index.html"),
    read("css-next/themes/statistics-bureau.css")
  ]);

  assert.match(registry, /id:\s*"statistics-bureau",\s*label:\s*"行政府統計局"/);
  assert.match(registry, /colorScheme:\s*"light"/);
  assert.match(controller, /TNX_THEME_REGISTRY/);
  assert.match(index, /statistics\.html/);
  assert.doesNotMatch(index, /value="statistics-bureau"/);
  assert.match(themeCss, /data-theme="statistics-bureau"/);
});

test("statistics dashboard only aggregates public character data", async () => {
  const [html, script] = await Promise.all([
    read("statistics.html"),
    read("js/statistics.js")
  ]);

  assert.match(html, /公開キャスト統計/);
  assert.match(html, /data-theme-override="statistics-bureau"/);
  assert.match(script, /from\("characters"\)/);
  assert.match(script, /eq\("visibility", "public"\)/);
  assert.doesNotMatch(script, /\.(insert|update|delete|upsert)\s*\(/);
  assert.match(script, /style_1/);
  assert.match(script, /citizen_rank/);
  assert.match(script, /experience_points/);
});
