import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const archiveCss = await readFile(new URL("../css-next/pages/archive.css", import.meta.url), "utf8");
const archiveEntry = await readFile(new URL("../css-next/pages/archive-entry.css", import.meta.url), "utf8");
const authState = await readFile(new URL("../js/auth-state.js", import.meta.url), "utf8");

test("cast management remains the primary authenticated archive action", () => {
  assert.match(authState, /class="auth-navigation__account"/);
  assert.match(authState, /キャスト管理/);
  assert.match(archiveCss, /body\[data-page="index\.html"\] \.auth-navigation__account[\s\S]*box-shadow: inset 3px 0 0 var\(--color-accent\)/);
  assert.match(archiveCss, /\.auth-navigation__account:is\(:hover, :focus-visible\)[\s\S]*transform: translateY\(-1px\)/);
  assert.match(archiveCss, /\.auth-navigation__account:is\(:hover, :focus-visible\)[\s\S]*color: var\(--color-text\)/);
});

test("logout stays visually secondary to cast management", () => {
  assert.match(archiveCss, /\.auth-navigation__logout[\s\S]*box-shadow: none;/);
  assert.match(archiveCss, /\.auth-navigation__logout:is\(:hover, :focus-visible\)[\s\S]*background: color-mix\(in srgb, var\(--color-accent\) 8%, var\(--color-surface\)\)/);
});

test("archive CSS cache key is advanced", () => {
  assert.match(archiveEntry, /@import url\("\.\/archive\.css\?v=6"\) layer\(archive-page\);/);
});
