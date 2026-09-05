import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const html = await read("account.html");
const entry = await read("css-next/pages/account-entry.css");
const overview = await read("css-next/pages/account-overview.css");
const metadata = await read("css-next/pages/account-operator-metadata.css");
const mobileLinks = await read("js/account-mobile-editor-links.js");

test("account entry uses canonical overview and metadata layers", () => {
  assert.match(entry, /account-actions, account-overview, account-operator-metadata;/);
  assert.match(entry, /account-overview\.css\?v=1/);
  assert.match(entry, /account-operator-metadata\.css\?v=1/);
  assert.doesNotMatch(entry, /polish/);
});

test("operator identity and metadata share the approved compact summary", () => {
  assert.match(html, /class="account-operator-summary"/);
  assert.match(overview, /\.account-operator-summary\s*\{[\s\S]*grid-template-columns:/);
  assert.match(metadata, /grid-template-columns: 150px minmax\(0, 1fr\)/);
  assert.match(metadata, /white-space: nowrap/);
});

test("account actions retain creation, management and utility hierarchy", () => {
  assert.match(html, /account-action-group--create[\s\S]*CREATE CAST/);
  assert.match(html, /account-action-group--manage[\s\S]*MANAGE \/ HISTORY/);
  assert.match(overview, /\.account-action-grid--create/);
  assert.match(overview, /\.account-action-grid--manage/);
  assert.match(html, /class="account-utility-actions"/);
  assert.match(html, /account-utility-action--logout/);
});

test("troop management remains injected beside management links", () => {
  assert.match(mobileLinks, /data-troop-management-link/);
  assert.match(mobileLinks, /actsLink\.insertAdjacentHTML\("afterend", markup\)/);
});

test("account overview remains theme-driven", () => {
  assert.match(overview, /var\(--color-accent\)/);
  assert.match(overview, /var\(--color-text\)/);
  assert.match(overview, /var\(--color-surface\)/);
  assert.doesNotMatch(overview, /#[0-9a-f]{3,8}\b/i);
});
