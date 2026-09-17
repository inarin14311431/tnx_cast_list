import assert from "node:assert/strict";
import fs from "node:fs";

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const generatorHtml = read("showcase-generator.html");
const generator = read("js/showcase-generator-v3.js");
const generatorLoader = read("js/showcase-generator-loader.js");
const generatedOutput = read("js/showcase-dedicated-output.js");
const publisher = read("js/showcase-dynamic-publish-v3.js");
const restore = read("js/showcase-edit-restore.js");
const runtime = read("js/act-showcase-theme-runtime.js");
const cinematicHtml = read("act-showcase.html");
const cinematicBootstrap = read("js/act-showcase-bootstrap.js");
const standardHtml = read("act-showcase-standard.html");
const cinematicPage = read("js/act-showcase-page.js");
const standardPage = read("js/act-showcase-standard.js");
const dedicatedCss = read("css-next/pages/act-showcase-dedicated-themes.css");
const surfaceCss = read("css-next/pages/act-showcase-theme-surface-system.css");
const phaseCss = read("css-next/pages/act-showcase-theme-phase-contract.css");
const legibilityCss = read("css-next/pages/act-showcase-theme-legibility.css");
const sceneCss = read("css-next/pages/act-showcase-theme-scene-contract.css");
const entryCss = read("css-next/pages/act-showcase-entry.css");

const themes = ["nova", "intron", "vlad", "lutetia"];
for (const theme of themes) {
  assert.match(generatorHtml, new RegExp(`option value=["']${theme}["']`), `${theme} compatibility id must remain selectable`);
  assert.match(runtime, new RegExp(`${theme}: Object\\.freeze`), `${theme} compatibility id must remain supported by runtime`);
  assert.match(dedicatedCss, new RegExp(`data-showcase-theme=["']${theme}["']`), `${theme} must have ACT-specific theme tokens`);
  assert.match(surfaceCss, new RegExp(`data-showcase-theme=["']${theme}["']`), `${theme} must have a dedicated surface personality`);
  assert.match(legibilityCss, new RegExp(`data-showcase-theme=["']${theme}["']`), `${theme} must have a final readable personality`);
  assert.match(sceneCss, new RegExp(`data-showcase-theme=["']${theme}["']`), `${theme} must own cinematic scene surfaces`);
}

assert.match(generatorHtml, /ネオン・グリッド \/ NEON GRID/);
assert.match(generatorHtml, /モノクローム・ドシエ \/ DOSSIER/);
assert.match(generatorHtml, /クリムゾン・ノワール \/ CRIMSON NOIR/);
assert.match(generatorHtml, /オービタル・グラス \/ ORBITAL GLASS/);
assert.match(generatorHtml, /HTML生成・スタンダード版・豪華版の3出力へ共通適用/);
assert.match(runtime, /storage ids are intentionally kept|Storage ids are intentionally kept/i);
assert.match(runtime, /label: "ネオン・グリッド"/);
assert.match(runtime, /label: "モノクローム・ドシエ"/);

assert.match(generator, /showcaseTheme: document\.querySelector\("#showcase-theme"\)/, "generator must still read the theme selector");
assert.match(publisher, /showcaseData\.theme = normalizeShowcaseTheme\(showcaseThemeField\?\.value\)/, "dynamic publish must persist theme inside showcase_data");
assert.match(restore, /setField\(elements\.showcaseTheme,[\s\S]*showcase\.theme/, "edit restore must restore saved compatibility ids");

assert.match(generatorHtml, /showcase-generator-loader\.js\?v=/);
assert.match(generatorLoader, /showcase-dedicated-output\.js\?v=/, "generator must load the current standard-output synchronizer");
assert.match(generatedOutput, /dedicated-standard-v4/);
assert.match(generatedOutput, /act-showcase-standard\.css\?v=/);
assert.match(generatedOutput, /act-showcase-standard-hotfix\.css\?v=/);
assert.match(generatedOutput, /act-showcase-dedicated-themes\.css\?v=/);
assert.match(generatedOutput, /act-showcase-theme-surface-system\.css\?v=/);
assert.match(generatedOutput, /act-showcase-theme-legibility\.css\?v=/);
assert.match(generatedOutput, /body\.id = "act-showcase-standard-page"/);
assert.match(generatedOutput, /showcaseOutput = OUTPUT_MARKER/);
assert.match(generatedOutput, /showcase-end wrap/);
assert.match(generatedOutput, /hero__scroll-cue/);

assert.doesNotMatch(cinematicHtml, /act-showcase-theme-runtime\.js/, "cinematic HTML must keep one-bootstrap architecture");
assert.match(cinematicBootstrap, /^await import\("\.\/act-showcase-theme-runtime\.js\?v=/, "cinematic bootstrap must initialize dedicated runtime first");
assert.match(cinematicHtml, /act-showcase-entry\.css\?v=/);
assert.match(standardHtml, /act-showcase-theme-runtime\.js\?v=/);
assert.match(standardHtml, /act-showcase-dedicated-themes\.css\?v=/);
assert.match(standardHtml, /act-showcase-theme-surface-system\.css\?v=/);
assert.match(standardHtml, /act-showcase-theme-legibility\.css\?v=/);
assert.doesNotMatch(standardHtml, /act-showcase-theme(?:-coverage)?\.css/);
assert.match(entryCss, /act-showcase-dedicated-themes\.css\?v=/);
assert.match(entryCss, /act-showcase-theme-surface-system\.css\?v=/);
assert.match(entryCss, /act-showcase-theme-phase-contract\.css\?v=/);
assert.match(entryCss, /act-showcase-theme-legibility\.css\?v=/);
assert.match(entryCss, /act-showcase-theme-scene-contract\.css\?v=/);
assert.ok(entryCss.indexOf("act-showcase-dedicated-themes.css") < entryCss.indexOf("act-showcase-theme-surface-system.css"));
assert.ok(entryCss.indexOf("act-showcase-theme-surface-system.css") < entryCss.indexOf("act-showcase-theme-phase-contract.css"));
assert.ok(entryCss.indexOf("act-showcase-theme-phase-contract.css") < entryCss.indexOf("act-showcase-theme-legibility.css"));
assert.ok(entryCss.indexOf("act-showcase-theme-legibility.css") < entryCss.indexOf("act-showcase-theme-scene-contract.css"));
assert.doesNotMatch(entryCss, /act-showcase-theme\.css|act-showcase-theme-coverage\.css|act-showcase-cinematic-theme\.css/);
assert.match(cinematicPage, /TNX_SHOWCASE_THEME\?\.applySaved\(data\?\.theme\)/);
assert.match(standardPage, /TNX_SHOWCASE_THEME\?\.applySaved\(data\?\.theme\)/);

assert.match(dedicatedCss, /STANDARD \+ generated standalone HTML/);
assert.match(dedicatedCss, /CINEMATIC \/ deluxe/);
assert.match(dedicatedCss, /SYSTEM ACCESS \/ title \/ trailer readout/);
assert.match(dedicatedCss, /HANDOUT -> CAST ASSIGN/);
assert.match(dedicatedCss, /Final ACT TRAILER stage/);
assert.match(dedicatedCss, /#act-showcase-standard-page/);
assert.match(dedicatedCss, /neotokyo-sequence__trailer-terminal/);
assert.match(dedicatedCss, /neotokyo-sequence__handout-panel/);
assert.match(dedicatedCss, /neotokyo-sequence__assign-frame/);
assert.match(dedicatedCss, /poster-v2-trailer-stage__heading/);

assert.match(surfaceCss, /Whole-page propagation/);
assert.match(surfaceCss, /ACT TRAILER/);
assert.match(surfaceCss, /HANDOUT -> CAST ASSIGN/);
assert.match(surfaceCss, /ACT READY/);
assert.match(surfaceCss, /Poster \/ opening page/);
assert.match(surfaceCss, /Supporting \/ guest cast/);
assert.match(surfaceCss, /STANDARD \+ generated HTML/);
assert.match(phaseCss, /phase theme contract/i);
assert.match(phaseCss, /ACT TITLE \/ credit lockup/);
assert.match(phaseCss, /ACT TRAILER: frame owns clipping/);
assert.match(phaseCss, /HANDOUT -> CAST ASSIGN \/ MATCH FOUND/);
assert.match(phaseCss, /ACT READY \/ ASSIGNMENT BAY/);
assert.match(legibilityCss, /final legibility layer/i);
assert.match(legibilityCss, /STANDARD \+ generated HTML/);
assert.match(legibilityCss, /Poster \/ opening/);
assert.match(legibilityCss, /ACT TITLE \/ credits/);
assert.match(legibilityCss, /cast-card__tagline/);
assert.match(legibilityCss, /opening-ruler/);
assert.match(sceneCss, /cinematic scene completion contract/i);
assert.match(sceneCss, /ACT TITLE/);
assert.match(sceneCss, /HANDOUT context/);
assert.match(sceneCss, /Assignment bridge/);
assert.match(sceneCss, /backdrop-filter:blur\(16px\)/);
assert.doesNotMatch(`${dedicatedCss}\n${surfaceCss}\n${phaseCss}\n${legibilityCss}\n${sceneCss}`, /!important/);

console.log("dedicated showcase theme contract: ok");