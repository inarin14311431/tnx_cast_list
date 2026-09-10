import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sequence = fs.readFileSync('js/act-showcase-neotokyo.js', 'utf8');
const page = fs.readFileSync('js/act-showcase-page.js', 'utf8');
const html = fs.readFileSync('act-showcase.html', 'utf8');
const bootstrap = fs.readFileSync('js/act-showcase-bootstrap.js', 'utf8');

test('ACT cinematic opening keeps its timed motion while the title waits for explicit advance', () => {
  assert.match(sequence, /await wait\(state, 2900\);/);
  assert.match(sequence, /await waitForAdvance\(state, "NEXT \/\/ ACT TRAILER"\);/);
});

test('ACT TRAILER readout is deliberately slower than the handout readout', () => {
  assert.match(sequence, /typeReadout\(state, copy, trailer, 4200, 34\)/);
  assert.match(sequence, /typeReadout\(state, copy, handoutBody, 2400\)/);
  assert.match(sequence, /maxInterval = 24/);
});

test('HANDOUT to ASSIGN linkage keeps split, search, found and cast reveal visible long enough', () => {
  assert.match(sequence, /await wait\(state, 780\);/);
  assert.match(sequence, /await wait\(state, 850\);/);
  assert.match(sequence, /await wait\(state, 560\);/);
  assert.match(sequence, /await wait\(state, 700\);/);
});

test('ACT cinematic modules remain cache-busted through the explicit bootstrap', () => {
  assert.match(page, /act-showcase-neotokyo\.js\?v=[A-Za-z0-9._-]+/);
  assert.match(html, /act-showcase-bootstrap\.js\?v=[A-Za-z0-9._-]+/);
  assert.match(bootstrap, /act-showcase-page\.js\?v=[A-Za-z0-9._-]+/);
});
