import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const accountJs = await readFile(new URL("../js/account.js", import.meta.url), "utf8");
const mobileLinks = await readFile(new URL("../js/account-mobile-editor-links.js", import.meta.url), "utf8");
const css = await readFile(new URL("../css-next/pages/account-action-hierarchy.css", import.meta.url), "utf8");

test("owned cast markup contains exactly one mobile editor action", () => {
  assert.equal((accountJs.match(/actionLabel\("モバイル編集", "MOBILE EDIT"\)/g) || []).length, 1);
  assert.doesNotMatch(mobileLinks, /data-mobile-sheet-link|createElement\("a"\)|pc\.after\(link\)/);
});

test("cast actions stay in two compact visual rows", () => {
  assert.match(css, /\.owned-cast__links[\s\S]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.owned-cast__management[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) minmax\(0, 2fr\)/);
  assert.match(css, /\.owned-cast__management > a[\s\S]*min-height:\s*46px/);
  assert.match(css, /\.owned-cast__management > button[\s\S]*width:\s*56px/);
});
