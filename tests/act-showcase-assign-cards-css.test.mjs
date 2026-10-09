import test from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { TRAILING_SOURCES, actShowcaseCss, actShowcaseSources, actShowcaseTrailingSources } from "./helpers/act-showcase-css.mjs";

// The assign-cards sections: structure in act-showcase-scenes.css (end of the file) and theme colours in
// act-showcase-theme-scenes.css (after visual-emphasis). The latter may follow the "final" visual-emphasis layer
// only because it styles nothing but its own card classes.
const selectorsOf = css => [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/(?:^|})\s*([^{}@]+)\{/g)]
  .flatMap(match => match[1].split(","))
  .map(selector => selector.trim())
  .filter(Boolean);

test("assign-cards sections sit at the end of their bundles", () => {
  const sources = actShowcaseSources().map(item => item.file);
  assert.equal(sources.at(-1), "act-showcase-assign-cards-theme.css");
  assert.equal(sources.indexOf("act-showcase-visual-emphasis.css") + 1, sources.indexOf("act-showcase-assign-cards-theme.css"));
  assert.equal(sources[sources.indexOf("act-showcase-handout-live-frame.css") + 1], "act-showcase-assign-cards.css");
  assert.deepEqual(actShowcaseTrailingSources().map(item => item.file), TRAILING_SOURCES);
});

test("the section after the final visual-emphasis layer only styles the style-card classes", () => {
  const selectors = selectorsOf(actShowcaseCss("act-showcase-assign-cards-theme"));
  assert.ok(selectors.length > 0);
  for (const selector of selectors) assert.match(selector, /neotokyo-style-card/, selector);
});

test("the assign-cards structure section never targets legacy chip selectors", () => {
  const css = actShowcaseCss("act-showcase-assign-cards");
  const selectors = selectorsOf(css);
  assert.ok(selectors.length > 0);
  for (const selector of selectors) {
    // the one rule outside the card classes is the phone layout fix for the linked layout
    if (/neotokyo-sequence__linked-layout/.test(selector)) continue;
    assert.match(selector, /neotokyo-style-card|neotokyo-sequence__style-cards|neotokyo-sequence__cast--linked\.is-styles-pending/, selector);
  }
  assert.doesNotMatch(css, /!important/);
});

test("the cards carry no artwork: no image urls and no pictorial glyphs", () => {
  for (const name of ["act-showcase-assign-cards", "act-showcase-assign-cards-theme"]) {
    assert.doesNotMatch(actShowcaseCss(name), /url\(/, name);
  }
});

// Flip timing: one table in the script, two CSS variables on the card row, and CSS with no second copy of the numbers.
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("flip timing lives in one table; the CSS reads --flip-turn / --flip-gap with the normal values as fallback", () => {
  const js = read("js/act-showcase-neotokyo.js");
  const css = actShowcaseCss("act-showcase-assign-cards");
  assert.doesNotMatch(js, /STYLE_CARD_GAP_MS|STYLE_CARD_TURN_MS/);
  assert.match(js, /--flip-turn/);
  assert.match(js, /--flip-gap/);
  assert.match(js, /flipMs \? flipMs \+ FLIP_SETTLE_MS : STYLE_HOLD_MS/);
  assert.doesNotMatch(js, /wait\(state, 700\)/);
  const inner = css.match(/\.neotokyo-style-card__inner\{[^}]*\}/)[0];
  assert.match(inner, /transition:transform var\(--flip-turn,600ms\) cubic-bezier\(\.2,\.8,\.2,1\) calc\(var\(--flip-index,0\) \* var\(--flip-gap,300ms\)\)/);
  assert.match(css, /transition:visibility 0s linear calc\(var\(--flip-turn,600ms\) \* \.14 \+ var\(--flip-index,0\) \* var\(--flip-gap,300ms\)\)/);
  assert.match(css, /transition-delay:calc\(var\(--flip-turn,600ms\) \* \.8 \+ var\(--flip-index,0\) \* var\(--flip-gap,300ms\)\)/);
  assert.doesNotMatch(css, /(?:transition|delay)[^;{}]*\b(?:320|160|240)ms/);
  assert.doesNotMatch(css, /\* 100ms/);
});

test("?flip= picks fast / normal / slow; anything else is normal", () => {
  const js = read("js/act-showcase-neotokyo.js");
  const start = js.indexOf("const FLIP_PRESETS");
  const end = js.indexOf("const flipTiming");
  const source = js.slice(start, end).replace("export function", "function");
  const { resolveFlipTiming } = new Function(`${source}; return { resolveFlipTiming };`)();
  assert.deepEqual(resolveFlipTiming("?flip=fast"), { turn: 320, gap: 100 });
  assert.deepEqual(resolveFlipTiming("?id=x&flip=normal"), { turn: 600, gap: 300 });
  assert.deepEqual(resolveFlipTiming("?flip=slow"), { turn: 900, gap: 450 });
  for (const search of ["", "?flip=", "?flip=FAST", "?flip=constructor", "?flip=__proto__", "?flip=toString", "?other=slow"]) {
    assert.deepEqual(resolveFlipTiming(search), { turn: 600, gap: 300 }, search);
  }
});
