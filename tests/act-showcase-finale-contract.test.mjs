import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const entry = readFileSync(new URL("../css-next/pages/act-showcase-entry.css", import.meta.url), "utf8");
const bootstrap = readFileSync(new URL("../js/act-showcase-bootstrap.js", import.meta.url), "utf8");
const enhancer = readFileSync(new URL("../js/act-showcase-finale-enhancer.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../css-next/pages/act-showcase-finale.css", import.meta.url), "utf8");

test("act showcase loads the finale enhancement after existing NeoTokyo layers", () => {
  assert.match(entry, /act-showcase-finale\.css\?v=[^"')\s]+/);
  assert.match(bootstrap, /act-showcase-finale-enhancer\.js\?v=[^"')\s]+/);
  assert.ok(entry.indexOf("act-showcase-ornament-plus.css") < entry.indexOf("act-showcase-finale.css"));
  assert.ok(bootstrap.indexOf("act-showcase-finale-enhancer.js") < bootstrap.indexOf("act-showcase-page.js"));
});

test("title enhancer turns the generated act title into a logo lockup", () => {
  assert.match(enhancer, /neotokyo-sequence__screen--title-logo/);
  assert.match(enhancer, /neotokyo-sequence__act-title--logo/);
  assert.match(enhancer, /ACT FILE \/\/ TITLE LOCK/);
  assert.match(enhancer, /TITLE VERIFIED/);
  assert.match(css, /neotokyo-title-glitch-cyan/);
  assert.match(css, /content:attr\(data-title\)/);
});

test("final summary becomes an ACT READY cast briefing without replacing canonical data", () => {
  assert.match(enhancer, /neotokyo-sequence__screen--finale/);
  assert.match(enhancer, /FINAL ACT FILE \/\/ CAST ASSEMBLED/);
  assert.match(enhancer, /ACT CORE/);
  assert.match(enhancer, /ASSIGNED/);
  assert.match(enhancer, /dataset\.castCount/);
  assert.match(css, /showcase-neotokyo-finale-active/);
  assert.match(css, /ENTER ACT \/\/ /);
  assert.match(css, /neotokyo-finale__cast-card/);
});

test("additional motion is disabled for reduced-motion users", () => {
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /animation:none/);
  assert.doesNotMatch(css, /!important/);
});
