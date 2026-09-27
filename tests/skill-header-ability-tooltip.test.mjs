import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("editor ability hover lives on general/style skill headers and follows live finals", async () => {
  const [renderer, ui, presentation] = await Promise.all([
    read("js/sheet-character-renderer.js"),
    read("js/ui-v25.js"),
    read("js/sheet-presentation-dom.js")
  ]);

  assert.doesNotMatch(renderer, /data-ability-tooltip=/);
  assert.match(ui, /#general-skills th\.suit-col,#style-skills th\.suit-col/);
  assert.match(ui, /data-ability-tooltip=/);
  assert.match(ui, /data-ability-tooltip-value/);
  assert.match(ui, /data-ability-tooltip-control/);
  assert.match(ui, /#\$\{key\}-final/);
  assert.match(ui, /#\$\{key\}-control-final/);
  assert.match(presentation, /querySelectorAll\?\.\(\`\[data-ability-tooltip=/);
});

test("public cast ability hover lives on general, social, connection and style skill headers", async () => {
  const [cast, compact, style] = await Promise.all([
    read("js/cast.js"),
    read("js/cast-compact-skills.js"),
    read("js/cast-style-skills.js")
  ]);

  assert.doesNotMatch(cast, /ability-value-trigger/);
  assert.match(compact, /if \(index >= 2\)/);
  assert.doesNotMatch(compact, /category === "general" && index >= 2/);
  assert.match(compact, /abilityHeaderMarkup/);
  assert.match(compact, /readAbilitySnapshot/);
  assert.match(style, /data-ability-tooltip=/);
  assert.match(style, /readAbilitySnapshot/);
  assert.match(cast, /data-ability-key=/);
});

test("editor suit headers allow ability tooltips to escape compact header cells", async () => {
  const [generalCss, styleCss] = await Promise.all([
    read("css-next/editor/skills.css"),
    read("css-next/editor/style-skills.css")
  ]);
  assert.match(generalCss, /th\.suit-col:has\(\.ability-value-trigger\)[\s\S]*overflow: visible/);
  assert.match(styleCss, /th\.suit-col:has\(\.ability-value-trigger\)[\s\S]*overflow: visible/);
});

test("ability tooltip presentation stays PC hover-only and is not tied to ability cards", async () => {
  const css = await read("css-next/components/ability-value-tooltip.css");
  assert.match(css, /th \.ability-value-trigger/);
  assert.match(css, /width: 72px/);
  assert.match(css, /data-ability-tooltip="reason"/);
  assert.match(css, /data-ability-tooltip="mundane"/);
  assert.doesNotMatch(css, /\.ability-card:has/);
  assert.match(css, /@media \(hover: hover\) and \(pointer: fine\)/);
  assert.match(css, /@media \(hover: none\), \(pointer: coarse\)/);
});
