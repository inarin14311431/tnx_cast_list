import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../act-showcase.html", import.meta.url), "utf8");
const neotokyo = await readFile(new URL("../js/act-showcase-neotokyo.js", import.meta.url), "utf8");

function textOf(className) {
  const match = html.match(new RegExp(`class="${className}">([^<]*)<`));
  assert.ok(match, `${className} must exist in act-showcase.html`);
  return match[1];
}

// The loading screen is visible before any script runs. Its text must already be the final text that
// prepareNeoTokyoLoading() sets, so nothing is rewritten (and nothing moves) when the script starts.
test("act-showcase.html's loading screen text equals what prepareNeoTokyoLoading sets", () => {
  const set = (variable) => {
    const match = neotokyo.match(new RegExp(`${variable}\\.textContent = "([^"]+)"`));
    assert.ok(match, `prepareNeoTokyoLoading must set ${variable}`);
    return match[1];
  };
  assert.equal(textOf("cinematic-intro__overline"), set("overline"));
  assert.equal(textOf("cinematic-intro__title"), set("title"));
  assert.equal(textOf("cinematic-intro__sub"), set("sub"));
});

test("act-showcase.html no longer ships the old loading wording", () => {
  assert.doesNotMatch(html, /PUBLIC ARCHIVE ACCESS/);
  assert.doesNotMatch(html, /cinematic-intro__title">ACT SHOWCASE</);
  assert.doesNotMatch(html, /アクト紹介を読み込み中/);
});

// The status line sits under the (opaque) loading screen and only shows an error afterwards, so it starts empty
// (the loading screen already says it is loading), like the standard page's.
test("the deluxe status line starts empty and is still the error target", async () => {
  assert.match(html, /<div id="act-showcase-status" class="showcase-loading"><\/div>/);
  const page = await readFile(new URL("../js/act-showcase-page.js", import.meta.url), "utf8");
  assert.match(page, /status\.classList\.add\("is-error"\)/);
});
