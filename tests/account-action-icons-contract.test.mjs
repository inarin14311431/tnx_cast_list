import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const icons = fs.readFileSync(new URL('../js/account-action-icons.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../account.html', import.meta.url), 'utf8');
const entry = fs.readFileSync(new URL('../css-next/pages/account-entry.css', import.meta.url), 'utf8');

test('owned cast actions expose accessible inline SVG icons', () => {
  for (const name of ['open', 'edit', 'mobile', 'acts', 'duplicate', 'delete']) {
    assert.match(icons, new RegExp(`${name}:`));
  }
  assert.match(icons, /stroke="currentColor"/);
  assert.match(icons, /aria-hidden="true"/);
  assert.match(icons, /MutationObserver/);
});

test('account page uses the consolidated cast-card assets', () => {
  assert.match(html, /account-entry\.css(?:\?v=\d+)?/);
  assert.match(entry, /account-actions\.css(?:\?v=\d+)?/);
  assert.doesNotMatch(entry, /account-action-hierarchy\.css/);
  assert.doesNotMatch(html, /account-action-icons\.css/);
  assert.doesNotMatch(html, /account-mobile-compact\.css/);
  assert.ok(html.indexOf('account-action-icons.js') > html.indexOf('account.js'));
});
