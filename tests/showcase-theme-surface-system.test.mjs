import { actShowcaseCssEntry, actShowcaseCss } from "./helpers/act-showcase-css.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");
const [surface, phase, legibility, scene, emphasis, entry, standardHtml, output, loader, generatorHtml] = await Promise.all([
  read("css-next/pages/act-showcase-theme-surface-system.css"),
  read("css-next/pages/act-showcase-theme-phase-contract.css"),
  read("css-next/pages/act-showcase-theme-legibility.css"),
  actShowcaseCss("act-showcase-theme-scene-contract"),
  actShowcaseCss("act-showcase-visual-emphasis"),
  actShowcaseCssEntry(),
  read("act-showcase-standard.html"),
  read("js/showcase-dedicated-output.js"),
  read("js/showcase-generator-loader.js"),
  read("showcase-generator.html")
]);

test("shared surface system is followed by phase behavior, legibility, scene completion, and visual emphasis", () => {
  assert.equal(entry.indexOf("act-showcase-dedicated-themes.css"), -1);
  assert.ok(surface.indexOf("ACT SHOWCASE dedicated themes.") < surface.indexOf("ACT SHOWCASE surface system."));
  assert.ok(entry.indexOf("act-showcase-theme-surface-system.css") < entry.indexOf("act-showcase-theme-phase-contract.css"));
  assert.ok(entry.indexOf("act-showcase-theme-phase-contract.css") < entry.indexOf("act-showcase-theme-legibility.css"));
  assert.ok(entry.indexOf("act-showcase-theme-legibility.css") < entry.indexOf("act-showcase-theme-scene-contract.css"));
  assert.ok(entry.indexOf("act-showcase-theme-scene-contract.css") < entry.indexOf("act-showcase-visual-emphasis.css"));
  assert.match(entry.trim().split("\n").at(-1), /act-showcase-visual-emphasis\.css\?v=/);
  assert.match(standardHtml, /act-showcase-theme-surface-system\.css\?v=/);
  assert.match(standardHtml, /act-showcase-theme-legibility\.css\?v=/);
  assert.match(output, /act-showcase-theme-surface-system\.css\?v=/);
  assert.match(output, /act-showcase-theme-legibility\.css\?v=/);
  assert.match(output, /dedicated-standard-v4/);
  assert.match(loader, /showcase-dedicated-output\.js\?v=/);
  assert.match(generatorHtml, /showcase-generator-loader\.js\?v=/);
});

test("reviewed cinematic surfaces remain theme-owned", () => {
  for (const selector of [
    ".neotokyo-sequence__trailer-terminal",
    ".neotokyo-sequence__readout.is-terminal-readout",
    ".neotokyo-sequence__cast--linked",
    ".neotokyo-sequence__summary-head",
    ".neotokyo-sequence__overview",
    ".poster-v2-frame",
    ".poster-v2-panel",
    ".poster-supporting-cast",
    ".poster-supporting-card"
  ]) {
    assert.ok(surface.includes(selector) || phase.includes(selector) || legibility.includes(selector) || scene.includes(selector) || emphasis.includes(selector), `theme layer missing ${selector}`);
  }
  assert.match(surface, /--showcase-surface-0/);
  assert.match(surface, /--showcase-border-strong/);
  assert.match(surface, /--showcase-name-surface/);
});

test("standard showcase page background does not tile when the page is taller than the viewport", async () => {
  const standardCss = await read("css-next/pages/act-showcase-standard.css");
  // js/act-showcase-standard.js sets document.body.style.backgroundImage (fixed + cover), so
  // background-repeat must be explicit here too. Without it, the default `repeat` tiles the
  // cover-sized image down the page whenever content grows taller than one viewport.
  assert.match(standardCss, /body\{[^}]*background-attachment:fixed[^}]*background-repeat:no-repeat/);
  // :root[data-showcase-theme] #act-showcase-standard-page{...} (this file) uses the `background`
  // shorthand, which implicitly resets background-repeat to its initial `repeat` value for any
  // sub-property it doesn't mention. Its ID selector outranks act-showcase-standard.css's bare
  // `body` selector, so that implicit `repeat` silently wins unless repeated here explicitly.
  assert.match(surface, /#act-showcase-standard-page\{[^}]*background:[\s\S]*?;[^}]*background-repeat:no-repeat/);
});

test("ACT TRAILER has a high-specificity viewport contract and only its readout scrolls", () => {
  assert.match(phase, /body#act-showcase-page[\s\S]*stage\.is-trailer-scroll[\s\S]*overflow:hidden/);
  assert.match(phase, /screen--trailer[\s\S]*max-height:min\(92svh,760px\)[\s\S]*overflow:hidden/);
  assert.match(phase, /trailer-terminal[\s\S]*max-height:min\(58svh,560px\)[\s\S]*overflow:hidden/);
  assert.match(phase, /readout\.is-terminal-readout[\s\S]*max-height:min\(46svh,440px\)[\s\S]*overflow:auto[\s\S]*scrollbar-gutter:stable/);
  assert.match(phase, /@media\(max-height:760px\) and \(min-width:761px\)/);
});

test("assigned cast name keeps its dedicated contrast surface and Dossier removes glow", () => {
  // The empty name plate behind .neotokyo-sequence__cast-detail (an empty box at the top of the assign panel) is gone.
  assert.doesNotMatch(surface, /cast-detail:before/);
  assert.match(surface, /--showcase-name-surface/);
  assert.match(surface, /cast-detail h3[\s\S]*color:var\(--showcase-text\)/);
  assert.match(surface, /data-showcase-theme="intron"[\s\S]*cast-detail h3[\s\S]*color:#171717[\s\S]*text-shadow:none/);
  assert.match(legibility, /cast-tagline[\s\S]*color:var\(--showcase-readable-text\)/);
});

test("all four dedicated personalities alter full surfaces without important overrides", () => {
  for (const id of ["nova", "intron", "vlad", "lutetia"]) {
    assert.match(surface, new RegExp(`:root\\[data-showcase-theme=["']${id}["']\\]`));
    assert.match(legibility, new RegExp(`:root\\[data-showcase-theme=["']${id}["']\\]`));
    assert.match(scene, new RegExp(`:root\\[data-showcase-theme=["']${id}["']\\]`));
  }
  assert.match(surface, /data-showcase-theme="intron"[\s\S]*--showcase-surface-1:rgba\(255,255,255,.98\)/);
  assert.match(surface, /data-showcase-theme="vlad"[\s\S]*--showcase-border-strong:rgba\(255,56,82,.68\)/);
  assert.match(surface, /data-showcase-theme="lutetia"[\s\S]*backdrop-filter:blur\(16px\)/);
  assert.match(legibility, /data-showcase-theme="intron"[\s\S]*--showcase-readable-text:#171717/);
  assert.doesNotMatch(`${surface}\n${phase}\n${legibility}\n${scene}\n${emphasis}`, /!important/);
});