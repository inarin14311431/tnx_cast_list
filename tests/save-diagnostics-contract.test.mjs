import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('save failures expose a diagnostic module with database metadata', async () => {
  const source = await read('js/sheet-save-diagnostics.js');
  assert.match(source, /save_character_bundle/);
  assert.match(source, /\.code/);
  assert.match(source, /\.details/);
  assert.match(source, /\.hint/);
  for (const code of ['23502', '23505', '23514', '22001', '42501']) assert.match(source, new RegExp(code));
});
