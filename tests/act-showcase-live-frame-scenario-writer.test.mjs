import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const bootstrap = read("js/act-showcase-bootstrap.js");
const cinematicLayout = read("js/act-showcase-cinematic-layout-v2.js");
const generatorLoader = read("js/showcase-generator-loader.js");
const generatorScenario = read("js/showcase-scenario-writer.js");
const dynamicPublish = read("js/showcase-dynamic-publish-v3.js");
const showcaseScenario = read("js/act-showcase-scenario-writer.js");
const standardScenario = read("js/act-showcase-standard-scenario-writer.js");
const standardHtml = read("act-showcase-standard.html");
const entryCss = read("css-next/pages/act-showcase-entry.css");
const hierarchyCss = read("css-next/pages/act-showcase-neotokyo-hierarchy.css");
const emphasisCss = read("css-next/pages/act-showcase-visual-emphasis.css");
const sceneCss = read("css-next/pages/act-showcase-theme-scene-contract.css");

test("ACT TRAILER no longer uses an inline terminal sizing module", () => {
  assert.doesNotMatch(bootstrap, /act-showcase-trailer-live-frame\.js/);
  assert.match(bootstrap, /act-showcase-cinematic-layout-v2\.js\?v=/);
  assert.match(cinematicLayout, /readout\.getBoundingClientRect\(\)\.bottom \+ window\.scrollY/);
  assert.match(cinematicLayout, /window\.scrollTo\(\{/);
  assert.doesNotMatch(cinematicLayout, /readout\.scrollTo\(\{/);
  assert.doesNotMatch(cinematicLayout, /terminal\.style\.(?:height|maxHeight|overflow)/);
  assert.match(emphasisCss, /showcase-trailer-document-scroll[\s\S]*stage\.is-trailer-scroll\{[\s\S]*overflow:visible/);
  assert.match(emphasisCss, /showcase-trailer-document-scroll[\s\S]*readout\.is-terminal-readout\{[\s\S]*overflow:visible/);
});

test("scenario writer is mounted at the same form level as RULER and invalidates stale generated output", () => {
  assert.match(generatorLoader, /showcase-scenario-writer\.js\?v=/);
  assert.match(generatorLoader, /showcase-dedicated-output\.js\?v=/);
  assert.ok(generatorLoader.indexOf("showcase-scenario-writer.js") < generatorLoader.indexOf("showcase-dedicated-output.js"));
  assert.ok(generatorLoader.indexOf("showcase-dedicated-output.js") < generatorLoader.indexOf("showcase-dynamic-publish-v3.js"));
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
  assert.match(bootstrap, /act-showcase-scenario-writer\.js\?v=/);
  assert.match(showcaseScenario, /className = "opening-ruler opening-scenario-writer"/);
  assert.match(showcaseScenario, /className = "poster-v2-credit-row"/);
  assert.match(showcaseScenario, /ruler\.cloneNode\(true\)/);
  assert.match(showcaseScenario, /SCENARIO WRITER/);
  assert.match(standardHtml, /act-showcase-standard-scenario-writer\.js\?v=/);
  assert.match(standardScenario, /className = "hero__ruler hero__scenario-writer"/);
});

test("RULER and SCENARIO WRITER title labels use the same compact horizontal credit layout", () => {
  assert.match(hierarchyCss, /\.neotokyo-sequence__ruler-credit\{[^}]*grid-template-columns:minmax\(0,1fr\)[^}]*grid-template-rows:auto auto auto/);
  assert.match(hierarchyCss, /\.neotokyo-sequence__ruler-label\{[^}]*writing-mode:horizontal-tb[^}]*transform:none[^}]*white-space:nowrap/);
  assert.doesNotMatch(hierarchyCss, /writing-mode:vertical-rl|rotate\(180deg\)/);
  assert.match(hierarchyCss, /\[data-scenario-writer-credit="title"\]\{margin-top:10px\}/);
  assert.match(sceneCss, /neotokyo-sequence__ruler-name/);
  assert.match(sceneCss, /neotokyo-sequence__ruler-role/);
});

test("showcase entry keeps the final theme layers wired without pinning cache revisions here", () => {
  assert.match(entryCss, /act-showcase-neotokyo-hierarchy\.css\?v=/);
  assert.match(entryCss, /act-showcase-handout-live-frame\.css\?v=/);
  assert.match(entryCss, /act-showcase-dedicated-themes\.css\?v=/);
  assert.match(entryCss, /act-showcase-theme-surface-system\.css\?v=/);
  assert.match(entryCss, /act-showcase-theme-phase-contract\.css\?v=/);
  assert.match(entryCss, /act-showcase-theme-legibility\.css\?v=/);
  assert.match(entryCss, /act-showcase-theme-scene-contract\.css\?v=/);
  assert.match(standardHtml, /act-showcase-theme-surface-system\.css\?v=/);
  assert.doesNotMatch(entryCss, /act-showcase-theme-coverage\.css|act-showcase-cinematic-theme\.css/);
});
