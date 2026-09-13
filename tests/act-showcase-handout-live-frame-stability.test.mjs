import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const bootstrap = read("js/act-showcase-bootstrap.js");
const handoutFrame = read("js/act-showcase-handout-live-frame.js");
const handoutCss = read("css-next/pages/act-showcase-handout-live-frame.css");
const storyFlow = read("js/act-showcase-story-flow.js");
const scenarioWriter = read("js/act-showcase-scenario-writer.js");
const supportingCast = read("js/act-showcase-supporting-cast.js");
const finalTrailer = read("js/act-showcase-final-trailer.js");
const page = read("js/act-showcase-page.js");

test("HANDOUT readout grows with typed content and delegates viewport overflow to the stage", () => {
  assert.match(bootstrap, /act-showcase-handout-live-frame\.js\?v=2/);
  assert.ok(bootstrap.indexOf("act-showcase-trailer-live-frame.js") < bootstrap.indexOf("act-showcase-handout-live-frame.js"));
  assert.ok(bootstrap.indexOf("act-showcase-handout-live-frame.js") < bootstrap.indexOf("act-showcase-page.js"));
  assert.match(handoutFrame, /readout\.scrollHeight/);
  assert.match(handoutFrame, /readout\.style\.height = `\$\{targetHeight\}px`/);
  assert.match(handoutFrame, /readout\.style\.overflow = "visible"/);
  assert.match(handoutFrame, /stage\.classList\.add\("is-handout-scroll"\)/);
  assert.match(handoutFrame, /ResizeObserver/);
  assert.match(handoutFrame, /MutationObserver/);
  assert.match(handoutFrame, /height \.16s cubic-bezier\(\.22,\.61,\.36,1\)/);
  assert.doesNotMatch(handoutFrame, /scrollIntoView|window\.scrollBy|window\.scrollTo/);
});

test("HANDOUT follows actual box growth with the stage without restarting the same smooth scroll", () => {
  assert.match(handoutFrame, /const handoutScrollTargets = new WeakMap\(\)/);
  assert.match(handoutFrame, /const remainingGrowth = Math\.max\(0, targetHeight - readout\.clientHeight\)/);
  assert.match(handoutFrame, /stage\.scrollHeight - stage\.clientHeight \+ remainingGrowth/);
  assert.match(handoutFrame, /const previousTarget = handoutScrollTargets\.get\(stage\)/);
  assert.match(handoutFrame, /Math\.abs\(targetTop - previousTarget\) <= 1/);
  assert.match(handoutFrame, /stage\.scrollTo\(\{/);
  assert.match(handoutFrame, /behavior: prefersReducedMotion\(\) \? "auto" : "smooth"/);
});

test("HANDOUT typewriter mutations update only the active readout instead of rescanning the whole surface", () => {
  assert.match(handoutFrame, /const pendingReadouts = new Set\(\)/);
  assert.match(handoutFrame, /if \(record\.type === "characterData"\) \{[\s\S]*if \(readout\) scheduleReadout\(readout\)/);
  assert.match(handoutFrame, /if \(record\.type === "childList"\) \{[\s\S]*if \(readout\) \{[\s\S]*scheduleReadout\(readout\);[\s\S]*continue/);
  assert.match(handoutFrame, /nodes\.some\(node => node\.nodeType === Node\.ELEMENT_NODE\)/);
  assert.match(handoutFrame, /if \(surfaceMayHaveChanged\) scheduleSync\(\)/);
});

test("HANDOUT live sizing releases control when assignment split starts and resets each new handout", () => {
  assert.match(handoutFrame, /!screen\.classList\.contains\("is-splitting"\)/);
  assert.match(handoutFrame, /stage\.classList\.remove\("is-handout-scroll"\)/);
  assert.match(handoutFrame, /releaseReadout\(activeReadout\)/);
  assert.match(handoutFrame, /readout\.style\.removeProperty\(property\)/);
  assert.match(handoutFrame, /if \(activeReadout !== readout \|\| activeStage !== stage\)/);
  assert.match(handoutFrame, /stage\.scrollTop = 0/);
  assert.match(handoutFrame, /handoutScrollTargets\.delete\(stage\)/);
});

test("HANDOUT releases stale ResizeObservers when the active handout changes", () => {
  assert.match(handoutFrame, /const readoutObservers = new WeakMap\(\)/);
  assert.match(handoutFrame, /readoutObservers\.set\(readout, resizeObserver\)/);
  assert.match(handoutFrame, /resizeObserver\?\.disconnect\(\)/);
  assert.match(handoutFrame, /readoutObservers\.delete\(readout\)/);
  assert.match(handoutFrame, /pendingReadouts\.delete\(readout\)/);
});

test("HANDOUT CSS makes the stage the sole scroll owner before assignment", () => {
  assert.match(handoutCss, /\.neotokyo-sequence__stage\.is-handout-scroll\{[^}]*overflow-y:auto/);
  assert.match(handoutCss, /\.neotokyo-sequence__screen--linked:not\(\.is-splitting\)\{[^}]*height:auto[^}]*max-height:none[^}]*overflow:visible/);
  assert.match(handoutCss, /\.neotokyo-sequence__readout\{[^}]*max-height:none[^}]*overflow:visible/);
  assert.doesNotMatch(handoutCss, /\.neotokyo-sequence__screen--linked\.is-splitting/);
});

test("high-frequency typewriter text mutations no longer trigger full showcase decoration scans", () => {
  assert.match(scenarioWriter, /hasStructuralElementMutation/);
  assert.match(scenarioWriter, /node\.nodeType === Node\.ELEMENT_NODE/);
  assert.match(supportingCast, /hasStructuralElementMutation/);
  assert.match(supportingCast, /node\.nodeType === Node\.ELEMENT_NODE/);
  assert.match(storyFlow, /hasStructuralElementMutation/);
  assert.match(storyFlow, /hasLinkedScreenStateMutation/);
  assert.match(storyFlow, /attributeFilter: \["class"\]/);
  assert.match(storyFlow, /target\.matches\("\.neotokyo-sequence__screen--linked"\)/);
});

test("linked screen state changes remain observable after text churn is filtered", () => {
  assert.match(storyFlow, /sequence\.classList\.contains\("is-read"\)/);
  assert.match(storyFlow, /sequence\.classList\.contains\("is-assigned"\)/);
  assert.match(storyFlow, /hasStructuralElementMutation\(record\) \|\| hasLinkedScreenStateMutation\(record\)/);
});

test("all cinematic showcase consumers share one public showcase service module URL", () => {
  assert.match(page, /public-showcase-service\.js\?v=1/);
  assert.match(scenarioWriter, /public-showcase-service\.js\?v=1/);
  assert.match(supportingCast, /public-showcase-service\.js\?v=1/);
  assert.match(finalTrailer, /public-showcase-service\.js\?v=1/);
  assert.doesNotMatch(finalTrailer, /public-showcase-service\.js\?v=20260912a/);
});
