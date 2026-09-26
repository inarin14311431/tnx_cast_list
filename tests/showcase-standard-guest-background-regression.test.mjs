import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const dedicatedOutput = read("js/showcase-dedicated-output.js");
const dynamicPublish = read("js/showcase-dynamic-publish-v3.js");
const standardHotfix = read("css-next/pages/act-showcase-standard-hotfix.css");
const standardHtml = read("act-showcase-standard.html");
const generatorHtml = read("showcase-generator.html");
const generatorLoader = read("js/showcase-generator-loader.js");

test("dedicated output keeps the selected background discoverable by publish extraction", () => {
  assert.match(dedicatedOutput, /data-showcase-background-source/);
  assert.match(dedicatedOutput, /extractInlineBackgroundUrl/);
  assert.match(dedicatedOutput, /body\{background-image:url/);
  assert.match(dynamicPublish, /querySelectorAll\("style"\)/);
  assert.match(dynamicPublish, /extractBackgroundUrl\(styleText\)/);
});

test("generated and standard guest cards share durable stylesheet coverage", () => {
  assert.match(standardHotfix, /\.guest-preview-card\{/);
  assert.match(standardHotfix, /\.guest-preview-card__image\{/);
  assert.match(standardHotfix, /\.standard-showcase-guest \.style\{/);
  assert.match(standardHotfix, /\.standard-showcase-guest \.cast-card__handout-body\{/);
});

test("showcase cache busters point to the regression-fixed assets", () => {
  assert.match(dedicatedOutput, /act-showcase-standard-hotfix\.css\?v=2/);
  assert.match(standardHtml, /act-showcase-standard-hotfix\.css\?v=2/);
  assert.match(generatorLoader, /showcase-dedicated-output\.js\?v=4/);
  assert.match(generatorHtml, /showcase-generator-loader\.js\?v=36/);
});
