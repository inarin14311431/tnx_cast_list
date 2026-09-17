import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const entry = await readFile(new URL("../css-next/pages/act-showcase-entry.css", import.meta.url), "utf8");
const dedicatedTheme = await readFile(new URL("../css-next/pages/act-showcase-dedicated-themes.css", import.meta.url), "utf8");
const surfaceSystem = await readFile(new URL("../css-next/pages/act-showcase-theme-surface-system.css", import.meta.url), "utf8");
const phaseContract = await readFile(new URL("../css-next/pages/act-showcase-theme-phase-contract.css", import.meta.url), "utf8");
const legibility = await readFile(new URL("../css-next/pages/act-showcase-theme-legibility.css", import.meta.url), "utf8");
const sceneContract = await readFile(new URL("../css-next/pages/act-showcase-theme-scene-contract.css", import.meta.url), "utf8");
const visualEmphasis = await readFile(new URL("../css-next/pages/act-showcase-visual-emphasis.css", import.meta.url), "utf8");
const combinedTheme = `${dedicatedTheme}\n${surfaceSystem}\n${phaseContract}\n${legibility}\n${sceneContract}\n${visualEmphasis}`;

const ids = ["nova", "intron", "vlad", "lutetia"];

test("dedicated ACT tokens, shared surfaces, phase, legibility, scene completion, and visual emphasis load in order", () => {
  const dedicated = entry.indexOf("act-showcase-dedicated-themes.css");
  const surface = entry.indexOf("act-showcase-theme-surface-system.css");
  const phase = entry.indexOf("act-showcase-theme-phase-contract.css");
  const readable = entry.indexOf("act-showcase-theme-legibility.css");
  const scene = entry.indexOf("act-showcase-theme-scene-contract.css");
  const emphasis = entry.indexOf("act-showcase-visual-emphasis.css");
  assert.ok(dedicated >= 0 && surface > dedicated && phase > surface && readable > phase && scene > readable && emphasis > scene);
  assert.match(entry.trim().split("\n").at(-1), /^@import "\.\/act-showcase-visual-emphasis\.css\?v=[A-Za-z0-9._-]+";$/);
  assert.doesNotMatch(entry, /act-showcase-theme\.css|act-showcase-theme-coverage\.css|act-showcase-cinematic-theme\.css/);
});

test("all four ACT-specific themes own explicit tokens and readable scene personalities", () => {
  for (const id of ids) {
    assert.match(dedicatedTheme, new RegExp(`:root\\[data-showcase-theme=["']${id}["']\\]`));
    assert.match(surfaceSystem, new RegExp(`:root\\[data-showcase-theme=["']${id}["']\\]`));
    assert.match(legibility, new RegExp(`:root\\[data-showcase-theme=["']${id}["']\\]`));
    assert.match(sceneContract, new RegExp(`:root\\[data-showcase-theme=["']${id}["']\\]`));
  }
  assert.match(dedicatedTheme, /--showcase-theme-name:"NEON GRID"/);
  assert.match(dedicatedTheme, /--showcase-theme-name:"DOSSIER"/);
  assert.match(dedicatedTheme, /--showcase-theme-name:"CRIMSON NOIR"/);
  assert.match(dedicatedTheme, /--showcase-theme-name:"ORBITAL GLASS"/);
  assert.match(legibility, /--showcase-readable-text/);
  assert.match(sceneContract, /--showcase-scene-text/);
  assert.match(sceneContract, /--showcase-scene-glass/);
  assert.match(sceneContract, /--showcase-scene-accent-3/);
});

test("intermediate cinematic sequence is driven by dedicated theme tokens and phase-owned surfaces", () => {
  for (const selector of [
    ".neotokyo-sequence__shell",
    ".neotokyo-sequence__trailer-terminal",
    ".neotokyo-sequence__readout.is-terminal-readout",
    ".neotokyo-sequence__handout-panel",
    ".neotokyo-sequence__assign-frame",
    ".neotokyo-sequence__cast--linked",
    ".neotokyo-sequence__search--linked",
    ".neotokyo-finale__cast-card"
  ]) {
    assert.ok(combinedTheme.includes(selector), `theme stack missing cinematic selector: ${selector}`);
  }
  assert.match(combinedTheme, /var\(--showcase-bg\)/);
  assert.match(combinedTheme, /var\(--showcase-primary(?:-rgb)?\)/);
  assert.match(combinedTheme, /var\(--showcase-secondary(?:-rgb)?\)/);
  assert.match(combinedTheme, /var\(--showcase-tertiary(?:-rgb)?\)/);
  assert.match(combinedTheme, /var\(--showcase-text\)/);
  assert.match(combinedTheme, /var\(--showcase-muted\)/);
});

test("phase contract closes high-specificity trailer, matching, title credit, and finale gaps", () => {
  assert.match(phaseContract, /body#act-showcase-page/);
  assert.match(phaseContract, /stage\.is-trailer-scroll[\s\S]*overflow:hidden/);
  assert.match(phaseContract, /readout\.is-terminal-readout[\s\S]*overflow:auto/);
  assert.match(phaseContract, /neotokyo-sequence__ruler-credit/);
  assert.match(phaseContract, /neotokyo-sequence__search--linked\.is-found/);
  assert.match(phaseContract, /neotokyo-sequence__screen--finale[\s\S]*neotokyo-finale__cast-card/);
  assert.match(phaseContract, /poster-supporting-card/);
});

test("legibility layer owns the broad screenshot-critical contrast surfaces", () => {
  assert.match(legibility, /cast-card__tagline/);
  assert.match(legibility, /opening-ruler/);
  assert.match(legibility, /poster-ornament__orbit/);
  assert.match(legibility, /poster-v2-aside/);
  assert.match(legibility, /neotokyo-sequence__screen--title/);
  assert.match(legibility, /neotokyo-sequence__act-title/);
  assert.match(legibility, /neotokyo-sequence__ruler-credit/);
  assert.match(legibility, /neotokyo-sequence__cast-tagline/);
  assert.match(legibility, /showcase-readable-surface-strong/);
});

test("scene completion contract covers all eight reported cinematic regressions", () => {
  assert.match(sceneContract, /neotokyo-story__title-note/);
  assert.match(sceneContract, /neotokyo-sequence__ruler-name/);
  assert.match(sceneContract, /neotokyo-title-logo__meta/);
  assert.match(sceneContract, /neotokyo-sequence__readout:after/);
  assert.match(sceneContract, /neotokyo-story__trailer-outro/);
  assert.match(sceneContract, /neotokyo-story__handout-context/);
  assert.match(sceneContract, /backdrop-filter:blur\(16px\)/);
  assert.match(sceneContract, /handout-panel \.neotokyo-sequence__readout/);
  assert.match(sceneContract, /neotokyo-sequence__link-bridge span/);
  assert.match(sceneContract, /neotokyo-story__signal-node/);
  assert.match(sceneContract, /neotokyo-story__entry-vectors/);
  assert.match(sceneContract, /neotokyo-sequence__assign-panel/);
});

test("Dossier stays intentionally light while the three dark themes never need neutral fallback surfaces", () => {
  assert.match(phaseContract, /data-showcase-theme="intron"[\s\S]*screen--title/);
  assert.match(surfaceSystem, /data-showcase-theme="intron"[\s\S]*--showcase-surface-1:rgba\(255,255,255,.98\)/);
  assert.match(legibility, /data-showcase-theme="intron"[\s\S]*--showcase-readable-text:#171717/);
  assert.match(sceneContract, /data-showcase-theme="intron"[\s\S]*--showcase-scene-bg:#ecebe7/);
  assert.match(sceneContract, /data-showcase-theme="nova"[\s\S]*--showcase-scene-bg:#02070b/);
  assert.match(sceneContract, /data-showcase-theme="vlad"[\s\S]*--showcase-scene-bg:#070203/);
  assert.match(sceneContract, /data-showcase-theme="lutetia"[\s\S]*--showcase-scene-bg:#050b18/);
  assert.match(sceneContract, /data-showcase-theme="intron"[\s\S]*act-title--logo\.showcase-fit-title[\s\S]*color:#171717/);
});

test("theme stack covers standard and cinematic states without important overrides", () => {
  assert.match(combinedTheme, /#act-showcase-standard-page/);
  assert.match(dedicatedTheme, /poster-v2-trailer-stage__heading/);
  assert.match(dedicatedTheme, /neotokyo-sequence__screen--linked\.is-found/);
  assert.match(dedicatedTheme, /neotokyo-sequence__screen--linked\.is-read/);
  assert.doesNotMatch(combinedTheme, /!important/);
});
