import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");
const exists = async path => { try { await access(new URL(path, root)); return true; } catch { return false; } };

const [cinematicHtml, generatorHtml, bootstrap, urlCanonicalizer, followupCss, posterCss, supportingJs] = await Promise.all([
  read("act-showcase.html"),
  read("showcase-generator.html"),
  read("js/act-showcase-bootstrap.js"),
  read("js/showcase-publish-url-canonicalizer.js"),
  read("css-next/pages/act-showcase-followup-v1.css"),
  read("css-next/pages/act-showcase-poster-v2.css"),
  read("js/act-showcase-supporting-cast.js")
]);

test("cinematic route is defined by act-showcase.html and legacy showcaseMode is canonicalized by bootstrap", async () => {
  assert.match(cinematicHtml, /body id="act-showcase-page"/);
  assert.match(cinematicHtml, /act-showcase-bootstrap\.js\?v=/);
  assert.equal(await exists("js/showcase-mode-compat.js"), false);
  assert.match(bootstrap, /searchParams\.get\("showcaseMode"\)/);
  assert.match(bootstrap, /searchParams\.delete\("showcaseMode"\)/);
  assert.doesNotMatch(bootstrap, /bgSample/);
  assert.match(generatorHtml, /showcase-generator-loader\.js\?v=\d+/);
  assert.match(urlCanonicalizer, /url\.searchParams\.delete\("showcaseMode"\)/);
});

test("selected ACT background is painted by the opening hero only", () => {
  assert.match(posterCss, /\.scene-opening:before\{[^}]*var\(--showcase-background\)/s);
  assert.match(followupCss, /body#act-showcase-page\.showcase-poster-v2-ready \.ambient-stage::before,[\s\S]*body#act-showcase-page\.showcase-poster-v2-ready \.poster-v2-board::before\{[\s\S]*display:none/);
  assert.match(followupCss, /body#act-showcase-page\.showcase-poster-v2-ready \.poster-v2-board\{\s*background:#030813/);
});

test("cast matching has an explicit scanning state and an obvious completion state", () => {
  assert.match(followupCss, /neotokyo-sequence__search--linked>strong::before/);
  assert.match(followupCss, /content:"照合中"/);
  assert.match(followupCss, /neotokyo-sequence__search--linked\.is-found>strong::before/);
  assert.match(followupCss, /content:"✓"/);
  assert.match(followupCss, /content:"完了！"/);
  assert.match(followupCss, /@keyframes showcase-match-orbit/);
  assert.match(followupCss, /@keyframes showcase-match-check/);
});

test("poster guest descriptions are rendered in full without line clamping", () => {
  assert.match(supportingJs, /textNode\("p", guest\.summary, "poster-supporting-card__summary"\)/);
  assert.match(followupCss, /body#act-showcase-page \.poster-supporting-card__summary\{[\s\S]*display:block/);
  assert.match(followupCss, /overflow:visible/);
  assert.match(followupCss, /-webkit-line-clamp:unset/);
  assert.match(followupCss, /white-space:pre-wrap/);
});
