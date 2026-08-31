import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("style skill description textarea can be resized vertically", async () => {
  const renderer = await read("js/sheet-skill-renderer.js");
  const css = await read("css-next/editor/style-skills.css");

  assert.match(renderer, /<textarea data-f="description" data-style-field="description" rows="2">/);
  assert.match(css, /#style-skills textarea\[data-style-field="description"\]\s*\{[\s\S]*?resize:\s*vertical;/);
  assert.match(css, /#style-skills textarea\[data-style-field="description"\]\s*\{[\s\S]*?overflow-x:\s*hidden;/);
});
