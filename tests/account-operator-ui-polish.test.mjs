import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const html = await read("account.html");
const entry = await read("css-next/pages/account-entry.css");
const css = await read("css-next/pages/account-ui-polish.css");
const mobileLinks = await read("js/account-mobile-editor-links.js");

test("operator identity and account metadata share one compact summary band", () => {
  assert.match(html, /class="account-panel account-operator-panel"/);
  assert.match(html, /class="account-operator-summary"/);
  assert.match(html, /class="account-operator-identity"[\s\S]*id="account-email"/);
  assert.match(html, /class="account-data"[\s\S]*id="account-user-id"[\s\S]*id="account-last-sign-in"/);
  assert.match(css, /\.account-operator-summary\s*\{[\s\S]*grid-template-columns:/);
});

test("primary workflows are grouped by creation and management purpose", () => {
  assert.match(html, /account-action-group--create[\s\S]*キャスト作成[\s\S]*CREATE CAST/);
  assert.match(html, /account-action-grid--create[\s\S]*href="\.\/sheet\.html"[\s\S]*href="\.\/sheet-mobile-new\.html"/);
  assert.match(html, /account-action-group--manage[\s\S]*管理・履歴[\s\S]*MANAGE \/ HISTORY/);
  assert.match(html, /account-action-grid--manage[\s\S]*href="\.\/acts\.html"[\s\S]*href="\.\/showcase-generator\.html"/);
  assert.match(css, /\.account-action-grid--create\s*\{[\s\S]*repeat\(2,/);
  assert.match(css, /\.account-action-grid--manage\s*\{[\s\S]*repeat\(3,/);
});

test("troop management remains injected beside account management links", () => {
  assert.match(mobileLinks, /document\.querySelector\("\.account-actions"\)/);
  assert.match(mobileLinks, /accountActions\.querySelector\('a\[href="\.\/acts\.html"\]'/);
  assert.match(mobileLinks, /data-troop-management-link/);
  assert.match(mobileLinks, /actsLink\.insertAdjacentHTML\("afterend", markup\)/);
});

test("backup and logout are separated from the primary workflow grid", () => {
  assert.match(html, /class="account-utility-actions"/);
  assert.match(html, /account-utility-action--backup[\s\S]*href="\.\/backup\.html"/);
  assert.match(html, /account-utility-action--logout[\s\S]*id="logout-button"/);
  const primaryBlock = html.match(/<div class="account-actions">([\s\S]*?)<div class="account-utility-actions"/i)?.[1] || "";
  assert.doesNotMatch(primaryBlock, /id="logout-button"/);
  assert.doesNotMatch(primaryBlock, /href="\.\/backup\.html"/);
});

test("account polish is isolated in the final cascade layer and remains theme-driven", () => {
  assert.match(entry, /account-actions, account-polish;/);
  assert.match(entry, /@import url\("\.\/account-ui-polish\.css\?v=1"\) layer\(account-polish\);/);
  assert.match(html, /account-entry\.css\?v=2/);
  assert.match(css, /var\(--color-accent\)/);
  assert.match(css, /var\(--color-text\)/);
  assert.match(css, /var\(--color-surface\)/);
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i);
});
