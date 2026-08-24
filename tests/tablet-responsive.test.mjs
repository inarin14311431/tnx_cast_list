import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('tablet layout is touch-gated so desktop CSS remains unchanged', async () => {
  const css = await read('css-next/tablet.css');
  assert.match(css, /@media \(pointer: coarse\) and \(min-width: 768px\) and \(max-width: 1100px\)/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /body\[data-page="sheet\.html"\] \.exp-panel/);
  assert.match(css, /body\[data-page="cast\.html"\] \.cast-header/);
  assert.match(css, /body\[data-page="index\.html"\] \.cast-grid/);

  const index = await read('css-next/index.css');
  assert.match(index, /@import url\("\.\/tablet\.css\?v=1"\)/);
});

test('large iPad keeps desktop structure and only enlarges touch targets', async () => {
  const css = await read('css-next/tablet.css');
  assert.match(css, /@media \(pointer: coarse\) and \(min-width: 1101px\) and \(max-width: 1366px\)/);
  assert.match(css, /min-height: 44px/);
});
