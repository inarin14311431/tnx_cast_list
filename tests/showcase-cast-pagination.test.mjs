import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

test("showcase cast selectors expose 15-item load-more controls", async () => {
  const html = await read("showcase-generator.html");
  const script = await read("js/showcase-cast-pagination.js");
  const css = await read("css-next/pages/showcase-cast-pagination.css");
  const entryCss = await read("css-next/pages/showcase-entry.css");

  assert.match(html, /id="public-cast-load-more"/);
  assert.match(html, /id="private-cast-load-more"/);
  assert.match(html, /showcase-cast-pagination\.js\?v=\d+/);
  assert.match(entryCss, /showcase-cast-pagination\.css\?v=\d+/);
  assert.match(script, /const PAGE_SIZE = 15/);
  assert.match(script, /visibleCount \+= PAGE_SIZE/);
  assert.match(script, /index >= visibleCount/);
  assert.match(script, /new MutationObserver/);
  assert.match(script, /#cast-search/);
  assert.match(script, /#player-filter/);
  assert.match(script, /#style-filter/);
  assert.match(css, /\.cast-pick-card\[hidden\]\{display:none\}/);
});

test("public filter changes reset the visible cast window to the first 15", async () => {
  const script = await read("js/showcase-cast-pagination.js");
  assert.match(script, /visibleCount = PAGE_SIZE/);
  assert.match(script, /control\.addEventListener\(eventName/);
  assert.match(script, /scheduleApply\(\)/);
});
