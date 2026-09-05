import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const details = await readFile(new URL("../css-next/pages/cast-view-details.css", import.meta.url), "utf8");
const entry = await readFile(new URL("../css-next/pages/cast-entry.css", import.meta.url), "utf8");
const castHtml = await readFile(new URL("../cast.html", import.meta.url), "utf8");

const desktopPlacementRule = /@media\(min-width:1200px\)\{\s*body\[data-page="cast\.html"\] \.identity-grid > \.cast-character-sheet-link\{\s*grid-column:4;\s*\}\s*\}/;

test("desktop character sheet warehouse link is pinned to the fourth identity column", () => {
  assert.match(details, desktopPlacementRule);
});

test("the fourth-column pin exists only inside the desktop media rule", () => {
  const withoutDesktopRule = details.replace(desktopPlacementRule, "");
  assert.doesNotMatch(
    withoutDesktopRule,
    /\.identity-grid > \.cast-character-sheet-link\s*\{[^}]*grid-column:4/
  );
});

test("cast viewer cache generations include the placement update", () => {
  assert.match(entry, /cast-view-details\.css\?v=5/);
  assert.match(castHtml, /cast-entry\.css\?v=8/);
});
