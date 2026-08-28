import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const account = fs.readFileSync(new URL('../js/account.js', import.meta.url), 'utf8');
const mobileLinks = fs.readFileSync(new URL('../js/account-mobile-editor-links.js', import.meta.url), 'utf8');

test('owned cast exposes the required actions', () => {
  assert.match(account, /actionLabel\("閲覧", "OPEN"\)/);
  assert.match(account, /actionLabel\("シート編集", "EDIT SHEET"\)/);
  assert.match(account, /sheet-mobile\.html\?id=\$\{id\}/);
  assert.match(account, /actionLabel\("モバイル編集", "MOBILE EDIT"\)/);
  assert.match(account, /owned-cast__management[\s\S]*actionLabel\("参加アクト", "ACTS"\)/);
  assert.match(account, /owned-cast__management-label">管理機能/);
  assert.match(account, /actionLabel\("複製", "DUPLICATE"\)/);
  assert.match(account, /actionLabel\("削除", "DELETE"\)/);
});

test('navigation accepts the mobile editor route', () => {
  assert.match(account, /\(cast\|sheet\|sheet-mobile\|acts\)/);
});

test('mobile editor action has a single markup source', () => {
  assert.equal((account.match(/actionLabel\("モバイル編集", "MOBILE EDIT"\)/g) || []).length, 1);
  assert.doesNotMatch(mobileLinks, /data-mobile-sheet-link|createElement\("a"\)|pc\.after\(link\)/);
});
