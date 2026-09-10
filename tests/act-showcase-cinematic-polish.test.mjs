import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("showcase generator exposes ACT TRAILER instead of intro wording", async () => {
  const html = await read("showcase-generator.html");
  assert.match(html, /アクトトレーラー/);
  assert.match(html, /ACT TRAILER \/\/ プレアクトで読み上げるトレーラー/);
  assert.match(html, /id="intro-text"/);
  assert.doesNotMatch(html, />イントロ文</);
});

test("current dynamic publisher stores trailer and not legacy intro", async () => {
  const [loader, publisher] = await Promise.all([
    read("js/showcase-generator-loader.js"),
    read("js/showcase-dynamic-publish-v3.js")
  ]);
  assert.match(loader, /showcase-dynamic-publish-v3\.js\?v=1/);
  assert.match(publisher, /version: 2/);
  assert.match(publisher, /trailer: trailerBody \? \{ title: "ACT TRAILER", body: trailerBody \} : null/);
  assert.doesNotMatch(publisher, /\n\s*intro:/);
});

test("showcase publish normalizes nested handle quotation marks without changing stored character data", async () => {
  const [publisher, normalizer] = await Promise.all([
    read("js/showcase-dynamic-publish-v3.js"),
    read("js/showcase-handle-normalizer.js")
  ]);
  assert.match(publisher, /normalizeDisplayQuotes/);
  assert.match(publisher, /fullName: normalizeDisplayQuotes/);
  assert.match(normalizer, /cast-pick-card__handle/);
  assert.match(normalizer, /selected-cast__identity h3/);
  assert.doesNotMatch(normalizer, /supabase|\.update\(|\.insert\(|\.upsert\(/i);
});

test("cinematic enhancer loads before the canonical page module through bootstrap", async () => {
  const [bootstrap, entry] = await Promise.all([
    read("js/act-showcase-bootstrap.js"),
    read("css-next/pages/act-showcase-entry.css")
  ]);
  const enhancerIndex = bootstrap.indexOf("act-showcase-cinematic-enhancer.js");
  const pageIndex = bootstrap.indexOf("act-showcase-page.js");
  assert.ok(enhancerIndex >= 0 && pageIndex > enhancerIndex);
  assert.match(entry, /act-showcase-cinematic\.css/);
});

test("legacy trailer payload fallback stays in the canonical model without a second RPC bridge", async () => {
  const [enhancer, page] = await Promise.all([
    read("js/act-showcase-cinematic-enhancer.js"),
    read("js/act-showcase-page.js")
  ]);
  assert.match(page, /data\.trailer \|\| data\.actTrailer \|\| data\.trailerText \|\| data\.trailerBody \|\| data\.intro/);
  assert.doesNotMatch(enhancer, /showcaseMode|bgSample|get_public_act_showcase|\/rest\/v1\/rpc\//);
});

test("act title uses cinematic reveal while multiline fitting is owned by cinematic-v2", async () => {
  const [enhancer, css] = await Promise.all([
    read("js/act-showcase-cinematic-enhancer.js"),
    read("css-next/pages/act-showcase-cinematic-v2.css")
  ]);
  assert.match(enhancer, /is-cinematic-title/);
  assert.doesNotMatch(enhancer, /whiteSpace = "nowrap"|fitSingleLineTitle/);
  assert.match(css, /act-title--logo\.showcase-fit-title\{[\s\S]*white-space:normal/);
});

test("SYSTEM ACCESS uses a dedicated cinematic access treatment", async () => {
  const [enhancer, css] = await Promise.all([
    read("js/act-showcase-cinematic-enhancer.js"),
    read("css-next/pages/act-showcase-cinematic.css")
  ]);
  assert.match(enhancer, /ACT FILE \/\/ ACCESS/);
  assert.match(enhancer, /PUBLIC ACCESS \/\/ AUTHORIZED/);
  assert.match(css, /cinematic-aperture/);
  assert.match(css, /cinematic-access-scan/);
});

test("ACT TRAILER is presented as PC terminal input with a blinking cursor", async () => {
  const [enhancer, css] = await Promise.all([
    read("js/act-showcase-cinematic-enhancer.js"),
    read("css-next/pages/act-showcase-cinematic.css")
  ]);
  assert.match(enhancer, /ACT_TRAILER\.TXT/);
  assert.match(enhancer, /INPUT MODE \/\/ REC/);
  assert.match(enhancer, /is-terminal-readout/);
  assert.match(css, /cinematic-cursor/);
  assert.match(css, /Share Tech Mono/);
});

test("cinematic override follows CSS audit rule and contains no important declarations", async () => {
  const css = await read("css-next/pages/act-showcase-cinematic.css");
  assert.doesNotMatch(css, /!important/);
});
