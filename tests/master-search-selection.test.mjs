import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('master search keeps selected rows across filter reruns', async () => {
  const source = await read('js/sheet-master-search.js');
  assert.match(source, /let selectedRows = new Map\(\)/);
  assert.doesNotMatch(source, /runButton\.disabled = true;\s*selectedIds\.clear\(\)/);
  assert.match(source, /selectedIds\.has\(String\(row\.id\)\) \? " checked"/);
  assert.match(source, /selectedRows\.set\(id, row\)/);
  assert.match(source, /const rows = \[\.\.\.selectedRows\.values\(\)\]/);
  assert.match(source, /__tnxMasterSearchSelectedIds/);
});

test('OFC master apply uses persistent master selection', async () => {
  const apply = await read('js/outfit-ofc-master-apply.js');
  assert.match(apply, /__tnxMasterSearchSelectedIds/);
  assert.doesNotMatch(apply, /outfit-ofc-tsv/);
});
