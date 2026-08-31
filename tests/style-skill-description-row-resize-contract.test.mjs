import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("style skill description resize grows the whole grid row", async () => {
  const renderer = await read("js/sheet-skill-renderer.js");
  const css = await read("css-next/editor/style-skill-resize.css");
  const integrity = await read("js/style-skill-detail-integrity.js");
  const entry = await read("css-next/pages/sheet-entry.css");

  assert.match(renderer, /textarea data-f="description" data-style-field="description"/);
  assert.match(css, /tr\[data-skill-key\]:not\(\.style-skill-separator-row\)\s*\{[\s\S]*?align-items:\s*stretch;/);
  assert.match(css, /td:has\(> textarea\[data-style-field="description"\]\)\s*\{[\s\S]*?align-items:\s*stretch;[\s\S]*?overflow:\s*visible;/);
  assert.match(entry, /style-skill-resize\.css\?v=1/);
  assert.match(integrity, /new ResizeObserver\(\(\) => syncDescriptionRowHeight\(textarea\)\)/);
  assert.match(integrity, /row\.style\.minHeight = `\$\{Math\.max\(50, textareaHeight \+ 10\)\}px`/);
  assert.match(integrity, /root\.addEventListener\("pointerdown"/);
  assert.match(integrity, /window\.addEventListener\("pointerup", stopDescriptionResizeTracking, true\)/);
});
