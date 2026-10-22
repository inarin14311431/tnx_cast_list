import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { assertVersionedMatch } from "./helpers/cache-version.mjs";

const html = await readFile(new URL("../act-showcase-standard.html", import.meta.url), "utf8");
const hotfixCss = await readFile(new URL("../css-next/pages/act-showcase-standard-hotfix.css", import.meta.url), "utf8");

test("standard ACT showcase never ships an initial loading message over the TOP hero", () => {
  assert.match(
    html,
    /<div id="act-showcase-standard-status" class="showcase-loading" hidden><\/div>/
  );
  assert.doesNotMatch(html, /id="act-showcase-standard-status"[^>]*>\s*アクト紹介を読み込み中/);
  assertVersionedMatch(html, /act-showcase-standard-hotfix\.css\?v=VERSION/);
  assert.match(hotfixCss, /#act-showcase-standard-status\.showcase-loading\[hidden\]\{display:none\}/);
  assert.match(html, /<div id="act-showcase-standard-root" hidden>/);
});

test("standard ACT showcase still exposes a fatal error when loading fails", () => {
  assert.match(hotfixCss, /#act-showcase-standard-status\.showcase-loading\.is-error\{display:grid\}/);
});
