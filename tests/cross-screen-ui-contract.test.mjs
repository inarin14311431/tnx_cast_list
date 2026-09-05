import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("screen entry styles load canonical functional modules", () => {
  const contracts = [
    ["css-next/pages/sheet-mobile-entry.css", "sheet-mobile-shell.css?v=1", "mobile-shell"],
    ["css-next/pages/showcase-entry.css", "showcase-theme.css?v=1", "showcase-theme"],
    ["css-next/pages/troop-entry.css", "troop-editor-actions.css?v=1", "troop-actions"],
    ["css-next/pages/archive-entry.css", "archive-discovery.css?v=1", "archive-discovery"],
    ["css-next/pages/acts-entry.css", "acts-summary.css?v=1", "acts-summary"],
    ["css-next/pages/troops-entry.css", "troops-registry-responsive.css?v=1", "troop-registry-responsive"],
  ];
  for (const [path, moduleName, layerName] of contracts) {
    const entry = read(path);
    assert.match(entry, new RegExp(moduleName.replace(/[.?]/g, "\\$&")));
    assert.match(entry, new RegExp(layerName));
    assert.doesNotMatch(entry, /polish/);
  }
});

test("mobile editor shell removes prototype wording and uses semantic state colors", () => {
  const css = read("css-next/pages/sheet-mobile-shell.css");
  assert.match(css, /CAST SHEET MOBILE EDITOR/);
  assert.match(css, /repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /var\(--color-warning/);
  assert.match(css, /var\(--color-success/);
  assert.doesNotMatch(css, /PROTOTYPE/);
});

test("showcase theme uses site tokens with a primary publish action", () => {
  const css = read("css-next/pages/showcase-theme.css");
  assert.match(css, /--showcase-cyan: var\(--color-accent\)/);
  assert.match(css, /#publish-button:not\(:disabled\)/);
  assert.match(css, /#download-button, #copy-button/);
});

test("troop editor actions stay available and registry rows reflow before mobile", () => {
  const editor = read("css-next/pages/troop-editor-actions.css");
  const registry = read("css-next/pages/troops-registry-responsive.css");
  assert.match(editor, /position: sticky/);
  assert.match(editor, /button\[type="submit"\]/);
  assert.match(registry, /min-width: 761px/);
  assert.match(registry, /max-width: 1050px/);
  assert.match(registry, /grid-column: 1 \/ -1/);
});

test("archive discovery and act summary retain the approved hierarchy", () => {
  const archive = read("css-next/pages/archive-discovery.css");
  const acts = read("css-next/pages/acts-summary.css");
  assert.match(archive, /archive-control--search input/);
  assert.match(archive, /height: 232px/);
  assert.match(acts, /article:nth-child\(4\)/);
  assert.match(acts, /font-size: 2\.45rem/);
});

test("legacy combo route redirects cast-specific requests and no longer runs the old editor", () => {
  const html = read("combos.html");
  assert.match(html, /sheet\.html\?id=\$\{encodeURIComponent\(id\)\}#combos/);
  assert.match(html, /キャストシートへ統合済み/);
  assert.match(html, /キャスト管理へ移動/);
  assert.doesNotMatch(html, /js\/combos\.js/);
  assert.doesNotMatch(html, /id="combo-form"/);
});
