import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("act showcase exposes one CSS entry and one module bootstrap", async () => {
  const [html, entry, bootstrap] = await Promise.all([
    read("act-showcase.html"),
    read("css-next/pages/act-showcase-entry.css"),
    read("js/act-showcase-bootstrap.js")
  ]);
  assert.match(html, /css-next\/pages\/act-showcase-entry\.css\?v=/);
  assert.match(html, /js\/act-showcase-bootstrap\.js\?v=/);
  assert.match(entry, /act-showcase-cast-selector\.css/);
  assert.match(bootstrap, /act-showcase-summary-advance-guard\.js/);
  assert.match(bootstrap, /act-showcase-page\.js/);
  assert.doesNotMatch(html, /js\/act-showcase-adaptive\.js/);
  assert.doesNotMatch(html, /js\/act-showcase-poster-bg\.js/);
  assert.doesNotMatch(html, /js\/act-showcase-poster-v2\.js/);
});

test("act showcase no longer carries the retired six-scene DOM", async () => {
  const html = await read("act-showcase.html");
  for (const retired of ["scene-trailer", "scene-handout", "scene-cast", "scene-data", "scene-end", "scene-progress"]) {
    assert.doesNotMatch(html, new RegExp(retired));
  }
  assert.match(html, /id="scene-opening"/);
  assert.match(html, /id="showcase-story"/);
});

test("canonical renderer consumes centralized public showcase data", async () => {
  const [source, service] = await Promise.all([
    read("js/act-showcase-page.js"),
    read("js/public-showcase-service.js")
  ]);
  assert.match(source, /loadPublicShowcase\(slug\)/);
  assert.match(source, /createShowcaseModel\(data\)/);
  assert.match(source, /renderPoster\(model\)/);
  assert.match(source, /model\.casts/);
  assert.match(service, /get_public_act_showcase/);
  assert.doesNotMatch(source, /\/rest\/v1\/rpc\/get_public_act_showcase/);
  assert.doesNotMatch(source, /MutationObserver/);
});

test("canonical renderer keeps every cast selectable while switching detail", async () => {
  const source = await read("js/act-showcase-page.js");
  assert.match(source, /createRoster\(model\.casts,/);
  assert.doesNotMatch(source, /createRoster\(model\.casts\.slice\(1\)\)/);
  assert.match(source, /activeCastIndex/);
  assert.match(source, /createCastGrid\(model, model\.casts\[activeCastIndex\]\)/);
  assert.match(source, /grid\.replaceWith\(nextGrid\)/);
  assert.match(source, /dataset\.castIndex/);
  assert.match(source, /aria-pressed/);
});

test("selected cast handout follows the selected cast", async () => {
  const source = await read("js/act-showcase-page.js");
  assert.match(source, /createHandoutPanel\(\[cast\]\)/);
});

test("NeoTokyo final summary only exits through the explicit footer action", async () => {
  const source = await read("js/act-showcase-summary-advance-guard.js");
  assert.match(source, /neotokyo-sequence__screen--summary/);
  assert.match(source, /neotokyo-sequence__stage/);
  assert.match(source, /stopPropagation\(\)/);
  assert.match(source, /capture: true/);
});

test("canonical renderer preserves public slug and link safety", async () => {
  const [source, service] = await Promise.all([
    read("js/act-showcase-page.js"),
    read("js/public-showcase-service.js")
  ]);
  assert.match(service, /normalizeShowcaseSlug/);
  assert.match(source, /safeImageUrl/);
  assert.match(source, /safeLinkUrl/);
  assert.match(source, /\["http:", "https:"\]\.includes\(url\.protocol\)/);
});
