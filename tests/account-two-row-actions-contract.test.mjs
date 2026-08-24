import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const account = fs.readFileSync(new URL('../js/account.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../css-next/pages/account-action-hierarchy.css', import.meta.url), 'utf8');

test('owned cast actions use requested two-row hierarchy', () => {
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

test('desktop card uses compact identity plus two-row action layout', () => {
  assert.match(css, /\.owned-cast \{[\s\S]*grid-template-columns:\s*minmax\(230px, \.8fr\) minmax\(500px, 1\.35fr\)/);
  assert.match(css, /\.owned-cast__links[\s\S]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.owned-cast__management[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) minmax\(0, 2fr\)/);
  assert.match(css, /\.owned-cast__management > a[\s\S]*min-height:\s*46px/);
  assert.match(css, /\.owned-cast__links > a[\s\S]*min-height:\s*46px/);
});
