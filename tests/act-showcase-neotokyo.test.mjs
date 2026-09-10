import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("cinematic route is owned by the page identity and centralized public service", async () => {
  const [source, service] = await Promise.all([
    read("js/act-showcase-page.js"),
    read("js/public-showcase-service.js")
  ]);
  assert.match(source, /document\.body\?\.id === "act-showcase-page"/);
  assert.match(source, /prepareNeoTokyoLoading\(cinematicIntro\)/);
  assert.match(source, /runNeoTokyoIntro\(\{ intro: cinematicIntro, model \}\)/);
  assert.match(source, /renderPoster\(model\)/);
  assert.match(source, /loadPublicShowcase\(slug\)/);
  assert.match(service, /get_public_act_showcase/);
  assert.doesNotMatch(source, /bgSample|\/rest\/v1\/rpc\/get_public_act_showcase/);
});

test("ACT system access is automatic while title and later narrative phases wait for explicit advance", async () => {
  const source = await read("js/act-showcase-neotokyo.js");
  const opening = source.indexOf("await showOpening(state)");
  const title = source.indexOf("await showActTitle(state, model)");
  const trailer = source.indexOf("await showTrailer(state, model)");
  const handout = source.indexOf("await showHandoutAndAssign");
  const summary = source.indexOf("await showSummary(state, model)");
  assert.ok(opening >= 0 && opening < title && title < trailer && trailer < handout && handout < summary);
  const openingBody = source.slice(source.indexOf("async function showOpening"), source.indexOf("async function showActTitle"));
  const titleBody = source.slice(source.indexOf("async function showActTitle"), source.indexOf("async function showTrailer"));
  const trailerBody = source.slice(source.indexOf("async function showTrailer"), source.indexOf("async function showHandoutAndAssign"));
  assert.doesNotMatch(openingBody, /waitForAdvance/);
  assert.match(titleBody, /waitForAdvance\(state, "NEXT \/\/ ACT TRAILER"\)/);
  assert.match(trailerBody, /waitForAdvance\(state, "NEXT \/\/ HANDOUT 01"\)/);
  assert.match(source, /waitForAdvance\(state, `ASSIGN \/\/ PC\$\{pcNumber\}`\)/);
  assert.match(source, /NEXT \/\/ ACT SUMMARY/);
  assert.match(source, /OPEN FULL SHOWCASE/);
});

test("NeoTokyo handout remains visible and shifts left while ASSIGN opens on the right", async () => {
  const [source, css] = await Promise.all([
    read("js/act-showcase-neotokyo.js"),
    read("css-next/pages/act-showcase-neotokyo-linked.css")
  ]);
  const body = source.slice(source.indexOf("async function showHandoutAndAssign"), source.indexOf("function createAssignedCast"));
  assert.match(body, /neotokyo-sequence__screen--linked/);
  assert.match(body, /neotokyo-sequence__handout-panel/);
  assert.match(body, /neotokyo-sequence__assign-panel/);
  assert.match(body, /sequence\.classList\.add\("is-splitting"\)/);
  assert.match(body, /assignPanel\.replaceChildren\(search\)/);
  assert.match(body, /assignPanel\.replaceChildren\(castCard\)/);
  assert.match(css, /is-splitting .*grid-template-columns/s);
  assert.match(css, /neotokyo-linked-cast-in/);
});

test("participation role is an explicit ASSIGN slot, not a fallback handout title", async () => {
  const [source, css] = await Promise.all([
    read("js/act-showcase-neotokyo.js"),
    read("css-next/pages/act-showcase-neotokyo-hierarchy.css")
  ]);
  const handoutBody = source.slice(source.indexOf("async function showHandoutAndAssign"), source.indexOf("function createAssignedCast"));
  assert.match(handoutBody, /const handoutTitle = clean\(handout\.title\) \|\| `PC\$\{pcNumber\} HANDOUT`/);
  assert.doesNotMatch(handoutBody, /handoutTitle = .*participationRole/);
  assert.match(source, /ASSIGN SLOT \/\/ 参加スタイル枠/);
  assert.match(source, /participation_role/);
  assert.match(css, /neotokyo-sequence__role-slot/);
});

test("NeoTokyo assignment preserves search, match and assigned sequence", async () => {
  const source = await read("js/act-showcase-neotokyo.js");
  assert.match(source, /SEARCHING CAST\.\.\./);
  assert.match(source, /MATCH FOUND/);
  assert.match(source, /CAST ASSIGNED/);
  assert.match(source, /ALL CASTS ASSIGNED/);
  assert.match(source, /ACT READY/);
});

test("NeoTokyo loader stays hidden after phase 6 exits", async () => {
  const [html, css, page] = await Promise.all([
    read("act-showcase.html"),
    read("css-next/pages/act-showcase-neotokyo-hierarchy.css"),
    read("js/act-showcase-page.js")
  ]);
  assert.match(html, /id="act-showcase-status" class="showcase-loading"/);
  assert.match(page, /status\.hidden = true/);
  assert.match(css, /^\.showcase-loading\[hidden\]\{display:none\}/);
});

test("NeoTokyo intro supports current trailer data and safe missing-data fallback", async () => {
  const [page, sequence] = await Promise.all([
    read("js/act-showcase-page.js"),
    read("js/act-showcase-neotokyo.js")
  ]);
  assert.match(page, /data\.trailer \|\| data\.actTrailer \|\| data\.trailerText \|\| data\.trailerBody \|\| data\.intro/);
  assert.match(sequence, /SAMPLE_TRAILER_MESSAGE/);
  assert.match(sequence, /公開用アクトトレーラーは未登録です/);
});

test("NeoTokyo assets are reachable through the CSS entry and page imports", async () => {
  const [entry, page] = await Promise.all([
    read("css-next/pages/act-showcase-entry.css"),
    read("js/act-showcase-page.js")
  ]);
  assert.match(entry, /act-showcase-neotokyo\.css/);
  assert.match(entry, /act-showcase-neotokyo-linked\.css/);
  assert.match(entry, /act-showcase-neotokyo-hierarchy\.css/);
  assert.match(page, /act-showcase-neotokyo\.js/);
});

test("NeoTokyo cast images keep protocol validation", async () => {
  const source = await read("js/act-showcase-neotokyo.js");
  assert.match(source, /safeImageUrl/);
  assert.match(source, /\["http:", "https:"\]\.includes\(url\.protocol\)/);
});

test("assigned cast remains visible when reduced motion disables its animation", async () => {
  const css = await read("css-next/pages/act-showcase-neotokyo.css");
  const rule = css.match(/\.neotokyo-sequence__cast\{([^}]+)\}/)[1];
  assert.match(rule, /opacity:1;/);
  assert.match(rule, /transform:none;/);
});
