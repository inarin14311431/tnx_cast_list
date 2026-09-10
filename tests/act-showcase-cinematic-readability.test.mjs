import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const entry = readFileSync(new URL("../css-next/pages/act-showcase-entry.css", import.meta.url), "utf8");
const bootstrap = readFileSync(new URL("../js/act-showcase-bootstrap.js", import.meta.url), "utf8");
const polish = readFileSync(new URL("../js/act-showcase-cinematic-polish.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../css-next/pages/act-showcase-cinematic-readability.css", import.meta.url), "utf8");

test("cinematic readability and polish keep their explicit entry order", () => {
  assert.match(entry, /act-showcase-cinematic-readability\.css\?v=20260908a/);
  assert.match(bootstrap, /act-showcase-cinematic-polish\.js\?v=20260910b/);
  assert.ok(entry.indexOf("act-showcase-finale.css") < entry.indexOf("act-showcase-cinematic-readability.css"));
  assert.ok(bootstrap.indexOf("act-showcase-cinematic-polish.js") < bootstrap.indexOf("act-showcase-page.js"));
});

test("title screen keeps native timers and advances without a forced click hold", () => {
  assert.doesNotMatch(polish, /window\.setTimeout\s*=/);
  assert.doesNotMatch(polish, /pauseArmed|ACCESS TRAILER|is-awaiting-title-access|60 \* 60 \* 1000/);
});

test("sequence observer only follows inserted screens and cannot self-trigger on class mutations", () => {
  assert.match(polish, /sequenceObserver\.observe\(intro, \{ childList: true, subtree: true \}\)/);
  assert.doesNotMatch(polish, /attributeFilter: \["aria-hidden", "class"\]/);
});

test("act titles and cast names use length-aware fitting on desktop", () => {
  assert.match(polish, /showcase-fit-title/);
  assert.match(polish, /showcase-fit-cast-name/);
  assert.match(polish, /poster-v2-name/);
  assert.match(polish, /neotokyo-sequence__cast-detail h3/);
  assert.match(css, /#opening-act-name\.showcase-fit-title/);
  assert.match(css, /poster-v2-name\.showcase-fit-cast-name/);
  assert.match(css, /data-name-fit="xlong"/);
});

test("final ACT READY screen exposes a prominent ACCESS ACT control", () => {
  assert.match(polish, /neotokyo-finale__access-button/);
  assert.match(polish, /ACCESS ACT/);
  assert.match(polish, /OPEN FULL SHOWCASE/);
  assert.match(css, /neotokyo-finale__access-button/);
  assert.match(css, /neotokyo-access-scan/);
});

test("new decoration keeps reduced-motion support and CSS architecture rules", () => {
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(css, /!important/);
});
