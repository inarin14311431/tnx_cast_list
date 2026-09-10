import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const entry = readFileSync(new URL("../css-next/pages/act-showcase-entry.css", import.meta.url), "utf8");
const bootstrap = readFileSync(new URL("../js/act-showcase-bootstrap.js", import.meta.url), "utf8");
const generatorHtml = readFileSync(new URL("../showcase-generator.html", import.meta.url), "utf8");
const board = readFileSync(new URL("../js/act-showcase-board-layout.js", import.meta.url), "utf8");
const trailer = readFileSync(new URL("../js/showcase-trailer-multiline.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../css-next/pages/act-showcase-layout-polish.css", import.meta.url), "utf8");

test("final layout polish loads after the previous cinematic readability layer", () => {
  assert.match(entry, /act-showcase-layout-polish\.css\?v=[^\"']+/);
  assert.match(bootstrap, /act-showcase-board-layout\.js\?v=[^\"']+/);
  assert.ok(entry.indexOf("act-showcase-cinematic-readability.css") < entry.indexOf("act-showcase-layout-polish.css"));
  assert.ok(bootstrap.indexOf("act-showcase-board-layout.js") < bootstrap.indexOf("act-showcase-page.js"));
});

test("PUBLIC DATA is condensed above the board and the cast grid becomes three columns", () => {
  assert.match(board, /poster-v2-act-meta/);
  assert.match(board, /rows\.get\("RULER"\)/);
  assert.match(board, /rows\.get\("KEY STYLE"\)/);
  assert.match(board, /credits\.remove\(\)/);
  assert.match(board, /poster-v2-grid--showcase3/);
  assert.doesNotMatch(board, /rows\.get\("CAST"\)/);
  assert.match(css, /poster-v2-grid--showcase3\{grid-template-columns:/);
});

test("assigned cast names and act titles use the wider screen without clipping", () => {
  assert.match(css, /neotokyo-sequence__screen--linked\{width:min\(1540px,100%\)\}/);
  assert.match(css, /data-name-fit="xlong"/);
  assert.match(css, /showcase-fit-cast-name\[data-fit="xlong"\]/);
  assert.match(css, /showcase-fit-title\[data-fit="medium"\]/);
  assert.match(css, /text-overflow:clip/);
});

test("ACCESS ACT uses a strong animated authorization gate with reduced-motion fallback", () => {
  assert.match(board, /neotokyo-finale__access-button/);
  assert.match(board, /CLICK TO ENTER \/\/ AUTHORIZED/);
  assert.match(css, /neotokyo-access-gate/);
  assert.match(css, /neotokyo-access-sweep/);
  assert.match(css, /neotokyo-access-frame/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
});

test("act trailer explicitly preserves pasted multiline text", () => {
  assert.match(generatorHtml, /showcase-trailer-multiline\.js\?v=[^\"']+/);
  assert.match(generatorHtml, /複数行の文章をそのまま貼り付けできます/);
  assert.match(generatorHtml, /textarea id="intro-text" rows="8"/);
  assert.match(trailer, /clipboardData/);
  assert.match(trailer, /setRangeText/);
  assert.match(trailer, /new Event\("input", \{ bubbles: true \}\)/);
});

test("new CSS obeys architecture rule forbidding important overrides", () => {
  assert.doesNotMatch(css, /!important/);
});
