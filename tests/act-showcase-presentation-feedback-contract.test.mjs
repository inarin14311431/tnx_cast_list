import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

test("presentation tuning loads after supporting cast styling", async () => {
  const entry = await read("css-next/pages/act-showcase-entry.css");
  const supporting = entry.indexOf("act-showcase-supporting-cast.css");
  const tuning = entry.indexOf("act-showcase-presentation-tuning.css");
  assert.ok(supporting >= 0 && tuning > supporting);
});

test("multiline-safe title sizing is owned by cinematic-v2 rather than presentation tuning", async () => {
  const [tuning, cinematic] = await Promise.all([
    read("css-next/pages/act-showcase-presentation-tuning.css"),
    read("css-next/pages/act-showcase-cinematic-v2.css")
  ]);
  assert.doesNotMatch(tuning, /white-space\s*:\s*nowrap/);
  assert.match(cinematic, /act-title--logo\.showcase-fit-title\{[\s\S]*white-space:normal/);
  assert.match(cinematic, /font-size:clamp\(2\.7rem,5vw,6\.2rem\)/);
  assert.doesNotMatch(cinematic, /!important/);
});

test("trailer stage owns adaptive scrolling and the readout remains overflow-visible", async () => {
  const [tuning, cinematic, writing] = await Promise.all([
    read("css-next/pages/act-showcase-presentation-tuning.css"),
    read("css-next/pages/act-showcase-cinematic-v2.css"),
    read("css-next/pages/act-showcase-writing-patterns.css")
  ]);
  assert.match(writing, /data-trailer-pattern=\"prose\"/);
  assert.match(writing, /white-space:pre-wrap/);
  assert.doesNotMatch(tuning, /neotokyo-sequence__screen--trailer/);
  assert.match(cinematic, /neotokyo-sequence__stage\.is-trailer-scroll\{[\s\S]*overflow-y:auto/);
  assert.match(cinematic, /screen--trailer \.neotokyo-sequence__readout\{[\s\S]*max-height:none;[\s\S]*overflow:visible/);
});

test("the selected handout style is highlighted while duplicate matches stay secondary", async () => {
  const [cinematic, supporting] = await Promise.all([
    read("css-next/pages/act-showcase-cinematic-v2.css"),
    read("css-next/pages/act-showcase-supporting-cast.css")
  ]);
  assert.match(cinematic, /styles span\.is-role-primary\{[\s\S]*border-color:#77ffd1/);
  assert.match(cinematic, /transform:translateY\(-1px\)/);
  assert.match(supporting, /is-assigned-style-duplicate\{opacity:\.45\}/);
});

test("guest files use a left and right two-column layout on desktop", async () => {
  const css = await read("css-next/pages/act-showcase-presentation-tuning.css");
  assert.match(css, /poster-supporting-cast__grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /neotokyo-supporting-cast__rail\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:900px\)/);
});

test("guest taglines use Japanese corner brackets", async () => {
  const js = await read("js/act-showcase-supporting-cast.js");
  assert.match(js, /`「\$\{guest\.tagline\}」`/);
  assert.doesNotMatch(js, /`“\$\{guest\.tagline\}”`/);
});
