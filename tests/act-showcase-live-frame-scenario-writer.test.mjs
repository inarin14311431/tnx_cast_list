import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const bootstrap = read("js/act-showcase-bootstrap.js");
const liveFrame = read("js/act-showcase-trailer-live-frame.js");
const generatorLoader = read("js/showcase-generator-loader.js");
const generatorScenario = read("js/showcase-scenario-writer.js");
const dynamicPublish = read("js/showcase-dynamic-publish-v3.js");
const showcaseScenario = read("js/act-showcase-scenario-writer.js");
const standardScenario = read("js/act-showcase-standard-scenario-writer.js");
const cinematicHtml = read("act-showcase.html");
const standardHtml = read("act-showcase-standard.html");
const generatorHtml = read("showcase-generator.html");
const entryCss = read("css-next/pages/act-showcase-entry.css");
const hierarchyCss = read("css-next/pages/act-showcase-neotokyo-hierarchy.css");

test("ACT TRAILER restores a size-driven live terminal height without replacing stage scrolling", () => {
  assert.match(bootstrap, /act-showcase-cinematic-enhancer\.js\?v=4/);
  assert.match(bootstrap, /act-showcase-trailer-live-frame\.js\?v=2/);
  assert.ok(bootstrap.indexOf("act-showcase-cinematic-enhancer.js") < bootstrap.indexOf("act-showcase-trailer-live-frame.js"));
  assert.ok(bootstrap.indexOf("act-showcase-trailer-live-frame.js") < bootstrap.indexOf("act-showcase-page.js"));
  assert.match(liveFrame, /readout\.scrollHeight/);
  assert.match(liveFrame, /bar\?\.offsetHeight/);
  assert.match(liveFrame, /verticalPadding \+ 30/);
  assert.match(liveFrame, /terminal\.style\.height = `\$\{targetHeight\}px`/);
  assert.match(liveFrame, /height \.16s cubic-bezier\(\.22,\.61,\.36,1\)/);
  assert.match(liveFrame, /MutationObserver/);
  assert.match(liveFrame, /ResizeObserver/);
  assert.match(liveFrame, /lastHeights/);
  assert.doesNotMatch(liveFrame, /scrollIntoView|window\.scrollBy/);
});

test("scenario writer is mounted at the same form level as RULER and invalidates stale generated output", () => {
  assert.match(generatorLoader, /showcase-scenario-writer\.js\?v=1/);
  assert.ok(generatorLoader.indexOf("showcase-scenario-writer.js") < generatorLoader.indexOf("showcase-dynamic-publish-v3.js"));
  assert.match(generatorScenario, /scenario-writer-name/);
  assert.match(generatorScenario, /showcase-credit-fields/);
  assert.match(generatorScenario, /gridTemplateColumns = "repeat\(2, minmax\(0, 1fr\)\)"/);
  assert.match(generatorScenario, /pair\.append\(rulerLabel\)/);
  assert.match(generatorScenario, /pair\.append\(label\)/);
  assert.match(generatorScenario, /pageTitle\?\.dispatchEvent\(new Event\("input"/);
});

test("scenario writer survives owned-showcase restore and standalone HTML output", () => {
  assert.match(generatorScenario, /get_owned_act_showcase_editor/);
  assert.match(generatorScenario, /showcaseData\?\.scenarioWriterName/);
  assert.match(generatorScenario, /hero__ruler hero__scenario-writer/);
  assert.match(generatorScenario, /copyPatchedShowcase/);
  assert.match(generatorScenario, /downloadPatchedShowcase/);
});

test("dynamic publishing stores scenarioWriterName in the public showcase JSON", () => {
  assert.match(dynamicPublish, /const scenarioWriterField = document\.querySelector\("#scenario-writer-name"\)/);
  assert.match(dynamicPublish, /showcaseData\.scenarioWriterName = scenarioWriterName/);
  assert.match(dynamicPublish, /hero__scenario-writer/);
  assert.match(dynamicPublish, /scenarioWriterName:/);
});

test("cinematic and standard public pages render SCENARIO WRITER at the same visual level as RULER", () => {
  assert.match(bootstrap, /act-showcase-scenario-writer\.js\?v=2/);
  assert.match(showcaseScenario, /className = "opening-ruler opening-scenario-writer"/);
  assert.match(showcaseScenario, /className = "poster-v2-credit-row"/);
  assert.match(showcaseScenario, /ruler\.cloneNode\(true\)/);
  assert.match(showcaseScenario, /SCENARIO WRITER/);
  assert.match(standardHtml, /act-showcase-standard-scenario-writer\.js\?v=1/);
  assert.match(standardScenario, /className = "hero__ruler hero__scenario-writer"/);
});

test("RULER and SCENARIO WRITER title labels use the same compact horizontal credit layout", () => {
  assert.match(hierarchyCss, /\.neotokyo-sequence__ruler-credit\{[^}]*grid-template-columns:minmax\(0,1fr\)[^}]*grid-template-rows:auto auto auto/);
  assert.match(hierarchyCss, /\.neotokyo-sequence__ruler-label\{[^}]*writing-mode:horizontal-tb[^}]*transform:none[^}]*white-space:nowrap/);
  assert.doesNotMatch(hierarchyCss, /writing-mode:vertical-rl|rotate\(180deg\)/);
  assert.match(hierarchyCss, /\[data-scenario-writer-credit="title"\]\{margin-top:10px\}/);
});

test("entry cache keys expose the latest generator, cinematic bootstrap, title-credit CSS, and handout live frame", () => {
  assert.match(generatorHtml, /showcase-generator-loader\.js\?v=29/);
  assert.match(cinematicHtml, /act-showcase-entry\.css\?v=8/);
  assert.match(cinematicHtml, /act-showcase-bootstrap\.js\?v=11/);
  assert.match(entryCss, /act-showcase-neotokyo-hierarchy\.css\?v=20260913a/);
  assert.match(entryCss, /act-showcase-handout-live-frame\.css\?v=1/);
});
