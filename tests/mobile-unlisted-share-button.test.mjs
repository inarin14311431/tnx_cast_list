import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

test("mobile unlisted sharing renders as one compact copy button", async () => {
  const source = await read("js/character-share-editor.js");

  assert.match(source, /mobile:\s*true/);
  assert.match(source, /character-share-panel character-share-panel--mobile/);
  assert.match(source, /<button id="character-share-copy" type="button">公開URLをコピー<\/button>/);
  assert.match(source, /button\.disabled = !url/);
  assert.match(source, /panel\.classList\.contains\("character-share-panel--mobile"\)[\s\S]*?\? "公開URLをコピー"/);
});

test("mobile share panel hides explanatory copy while keeping status accessible", async () => {
  const source = await read("js/character-share-editor.js");
  const mobileMarkup = source.match(/panel\.innerHTML = target\.mobile \? `([\s\S]*?)` : `/)?.[1] || "";

  assert.ok(mobileMarkup, "mobile share markup should exist");
  assert.doesNotMatch(mobileMarkup, /限定公開URL/);
  assert.doesNotMatch(mobileMarkup, /UNLISTED SHARE LINK/);
  assert.doesNotMatch(mobileMarkup, /URLを知っている人のみ閲覧できます/);
  assert.match(mobileMarkup, /character-share-panel__status--sr-only/);
});

test("mobile share panel uses footer-sized controls without the card chrome", async () => {
  const css = await read("css-next/components/character-share.css");

  assert.match(css, /\.mobile-sheet-actions \.character-share-panel--mobile\s*\{[\s\S]*?margin:\s*0;[\s\S]*?padding:\s*0;[\s\S]*?border:\s*0;[\s\S]*?background:\s*transparent;/);
  assert.match(css, /\.mobile-sheet-actions \.character-share-panel--mobile \.character-share-panel__controls button\s*\{[\s\S]*?min-height:\s*50px;[\s\S]*?padding:\s*8px 10px;/);
});

test("mobile fixed actions keep top, view, share and save on one row only when share is visible", async () => {
  const css = await read("css-next/pages/sheet-mobile-ux.css");

  assert.match(css, /\.mobile-sheet-actions\s*\{[\s\S]*?grid-template-columns:64px minmax\(78px,.8fr\) minmax\(128px,1.55fr\)/);
  assert.match(css, /\.mobile-sheet-actions:has\(\.character-share-panel--mobile:not\(\[hidden\]\)\)\s*\{[\s\S]*?grid-template-columns:56px minmax\(68px,.75fr\) minmax\(118px,1.45fr\) 62px;/);
  assert.match(css, /character-share-panel--mobile[\s\S]*?character-share-panel__controls button[\s\S]*?font-size:11px;[\s\S]*?white-space:nowrap;/);
  assert.match(css, /@media\(max-width:390px\)[\s\S]*?\.mobile-sheet-actions:has\(\.character-share-panel--mobile:not\(\[hidden\]\)\)\{grid-template-columns:52px minmax\(62px,.7fr\) minmax\(108px,1.35fr\) 56px/);
});

test("mobile entry points bust caches for the compact share UI", async () => {
  const [html, entry, app] = await Promise.all([
    read("sheet-mobile.html"),
    read("css-next/pages/sheet-mobile-entry.css"),
    read("js/sheet-mobile-app.js")
  ]);

  assert.match(html, /sheet-mobile-entry\.css\?v=3/);
  assert.match(html, /sheet-mobile-app\.js\?v=10/);
  assert.match(entry, /sheet-mobile-ux\.css\?v=4/);
  assert.match(entry, /character-share\.css\?v=2/);
  assert.match(app, /character-share-editor\.js\?v=2/);
});
