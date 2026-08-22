import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const comboCss = await readFile(
  new URL("../css-next/editor/combos.css", import.meta.url),
  "utf8"
);

test("combo section header gets the same filled hover feedback as other section toggles", () => {
  assert.match(
    comboCss,
    /\.sheet-combo-entry__header\.section-toggle:is\(:hover, :focus-visible\)[\s\S]*background:\s*var\(--sheet-section-accent\)/
  );

  assert.match(
    comboCss,
    /#sheet-combo-entry-title,[\s\S]*small,[\s\S]*::after[\s\S]*color:\s*var\(--color-on-accent/
  );

  assert.match(
    comboCss,
    /\.sheet-combo-entry__tag[\s\S]*color:\s*var\(--color-on-accent/
  );
});
