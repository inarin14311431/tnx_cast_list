import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('quick sheet compaction is loaded by the cast viewer', async () => {
  const html = await read('cast.html');
  assert.match(html, /cast-quick-sheet-compact\.js/);
});

test('quick sheet hides unregistered sections and can detach page three', async () => {
  const source = await read('js/cast-quick-sheet-compact.js');
  assert.match(source, /removeUnregisteredGeneralRows/);
  assert.match(source, /section\.hidden = !hasVisibleData/);
  assert.match(source, /detachThirdPageIfUnused/);
  assert.match(source, /pageOverflows\(pageTwo\)/);
});

test('quick outfit values are rendered in cast core without post-render patching', async () => {
  const castSource = await read('js/cast.js');
  const compactSource = await read('js/cast-quick-sheet-compact.js');
  assert.match(castSource, /formatPurchasePair\(outfit\)/);
  assert.match(castSource, /formatConcealmentPair\(outfit\)/);
  assert.match(castSource, /cs_modifier:\s*"CS修正"/);
  assert.doesNotMatch(castSource, /cs_value/);
  assert.doesNotMatch(compactSource, /cast-quick-outfit-pairs/);
});
