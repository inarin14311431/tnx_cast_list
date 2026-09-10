import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const entry = readFileSync(new URL("../css-next/pages/act-showcase-entry.css", import.meta.url), "utf8");
const bootstrap = readFileSync(new URL("../js/act-showcase-bootstrap.js", import.meta.url), "utf8");
const js = readFileSync(new URL("../js/act-showcase-story-flow.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../css-next/pages/act-showcase-story-flow.css", import.meta.url), "utf8");

test("story flow enhancement loads after layout polish and before the module renderer", () => {
  assert.match(entry, /act-showcase-story-flow\.css\?v=[^\"']+/);
  assert.match(bootstrap, /act-showcase-story-flow\.js\?v=[^\"']+/);
  assert.ok(entry.indexOf("act-showcase-layout-polish.css") < entry.indexOf("act-showcase-story-flow.css"));
  assert.ok(bootstrap.indexOf("act-showcase-story-flow.js") < bootstrap.indexOf("act-showcase-page.js"));
});

test("handout context is derived from registered source text instead of invented metadata", () => {
  assert.match(js, /CAST INVOLVEMENT/);
  assert.match(js, /キャスト\|PC/);
  assert.match(js, /設定/);
  assert.match(js, /コネ/);
  assert.match(js, /(?:PS|ＰＳ)/);
  assert.match(js, /ENTRY VECTOR \/\/ 参加経緯/);
});

test("participation style highlights only the first matching duplicate", () => {
  assert.match(js, /let primaryFound = false/);
  assert.match(js, /is-role-primary/);
  assert.match(js, /is-role-duplicate/);
  assert.match(css, /styles span\.is-role-primary/);
});

test("trailer and finale explicitly connect the premise to cast entry", () => {
  assert.match(js, /WHO ANSWERS THIS CALL\?/);
  assert.match(js, /HOW THE CASTS ARRIVE/);
  assert.match(js, /ALL THREADS CONVERGE \/\/ THE ACT BEGINS NOW/);
  assert.match(css, /neotokyo-story__trailer-outro/);
  assert.match(css, /neotokyo-story__entry-vectors/);
});

test("profile presentation separates GENDER and ID", () => {
  assert.match(js, /label\.includes\("GENDER"\)/);
  assert.match(js, /label\.includes\("ID"\)/);
  assert.match(js, /term\.textContent = "GENDER"/);
  assert.match(js, /node\("dt", "", "ID"\)/);
});

test("handout assignment route has motion while reduced motion remains supported", () => {
  assert.match(css, /neotokyo-story__signal/);
  assert.match(css, /@keyframes neotokyo-story-signal/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(css, /!important/);
});
